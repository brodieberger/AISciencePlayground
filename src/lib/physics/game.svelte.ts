import Matter from "matter-js";
import { uiState, physicsGameState } from '$lib/game-ui.svelte';

import {
    createBounds,
    createBallAndCage,
    createGoal,
    cageWalls,
    spawnPrefab
} from "./level-creation";

import { levels, type PrefabType } from "./level-data";

const { Engine, World, Render, Runner, Bodies, Events, Body, Query } = Matter;

const SEESAW_MAX_ANGLE = (40 * Math.PI) / 180;

let engine: Matter.Engine;
let world: Matter.World;
let render: Matter.Render;
let runner: Matter.Runner;

let ball: Matter.Body;
let goal: Matter.Body;

let drawnLines: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}[] = [];

let placedPrefabs: { type: PrefabType; body: Matter.Body | Matter.Body[] }[] = [];
let drawnLineBodies: Matter.Body[] = [];
let seesawBeams: Matter.Body[] = [];

let overlayCanvas: HTMLCanvasElement;
let overlayCtx: CanvasRenderingContext2D;

let drawing = false;
let currentLine: { x1: number; y1: number; x2: number; y2: number } | null = null;
let mouseDownPos: { x: number; y: number } | null = null;
let ghostPos: { x: number; y: number } | null = null;

let container: HTMLElement;
let onGoalReached: (() => void) | null = null;

export function startGame(
    targetContainer: HTMLElement,
    options: { onGoal?: () => void } = {}
) {
    container = targetContainer;
    onGoalReached = options.onGoal || null;
    init();
}

function init() {
    engine = Engine.create();
    engine.gravity.y = 2;
    world = engine.world;

    const w = container.clientWidth;
    const h = container.clientHeight;

    render = Render.create({
        element: container,
        engine,
        options: {
            width: w,
            height: h,
            background: "#0b1020",
            wireframes: false
        }
    });

    render.canvas.style.position = "absolute";
    render.canvas.style.zIndex = "1";

    Render.run(render);
    runner = Runner.create();
    Runner.run(runner, engine);

    setupOverlay(w, h);
    createBounds(world, w, h);

    const level = levels[physicsGameState.currentLevelIndex];
    ball = createBallAndCage(world, level);
    goal = createGoal(world, level);

    physicsGameState.inventory = level.prefabs.map(p => ({ ...p }));
    physicsGameState.activePrefab = null;

    placedPrefabs = [];
    seesawBeams = [];

    Events.on(engine, "afterUpdate", () => {
        redrawLines();
        clampSeesaws();
    });

    let bounceCooldown = false;

    Events.on(engine, "collisionStart", (event) => {
        event.pairs.forEach(({ bodyA, bodyB }) => {
            if (
                (bodyA === ball && bodyB === goal) ||
                (bodyA === goal && bodyB === ball)
            ) {
                if (onGoalReached) onGoalReached();
            }

            const isBouncepad = (b: Matter.Body) => b.label === 'prefab:bouncepad';
            if (
                !bounceCooldown &&
                ((bodyA === ball && isBouncepad(bodyB)) ||
                 (bodyB === ball && isBouncepad(bodyA)))
            ) {
                bounceCooldown = true;
                setTimeout(() => { bounceCooldown = false; }, 300);

                const pad = isBouncepad(bodyA) ? bodyA : bodyB;
                const incomingSpeed = Math.hypot(ball.velocity.x, ball.velocity.y);
                const launchY = -Math.max(12, incomingSpeed * 1.4);
                Body.setVelocity(ball, { x: ball.velocity.x, y: launchY });
                animateBouncePad(pad);
            }
        });
    });

    updateAIContext();
}

// SEESAW ANGLE CLAMP
function clampSeesaws() {
    for (const beam of seesawBeams) {
        if (beam.angle > SEESAW_MAX_ANGLE) {
            Body.setAngle(beam, SEESAW_MAX_ANGLE);
            Body.setAngularVelocity(beam, 0);
        } else if (beam.angle < -SEESAW_MAX_ANGLE) {
            Body.setAngle(beam, -SEESAW_MAX_ANGLE);
            Body.setAngularVelocity(beam, 0);
        }
    }
}

function setupOverlay(w: number, h: number) {
    overlayCanvas = document.createElement("canvas");
    overlayCanvas.width = w;
    overlayCanvas.height = h;
    overlayCanvas.style.position = "absolute";
    overlayCanvas.style.top = "0";
    overlayCanvas.style.left = "0";
    overlayCanvas.style.zIndex = "10";

    container.appendChild(overlayCanvas);

    const ctx = overlayCanvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D context");
    overlayCtx = ctx;

    if (physicsGameState.currentLevelIndex === 3) {
        overlayCanvas.addEventListener("mousedown", startDrawing);
        overlayCanvas.addEventListener("mousemove", onMouseMove);
        overlayCanvas.addEventListener("mouseup", stopDrawing);
        overlayCanvas.addEventListener("mouseleave", onMouseLeave);
    }
    overlayCanvas.addEventListener("click", onCanvasClick);
    overlayCanvas.addEventListener("dragover", onDragOver);
    overlayCanvas.addEventListener("drop", onDrop);
    overlayCanvas.addEventListener("dragleave", onDragLeave);
}

function startDrawing(e: MouseEvent) {
    if (physicsGameState.activePrefab || physicsGameState.currentLevelIndex >= levels.length) return;
    mouseDownPos = { x: e.offsetX, y: e.offsetY };
    drawing = true;
    currentLine = { x1: e.offsetX, y1: e.offsetY, x2: e.offsetX, y2: e.offsetY };
}

function onMouseMove(e: MouseEvent) {
    if (drawing && currentLine) {
        currentLine.x2 = e.offsetX;
        currentLine.y2 = e.offsetY;
    }
}

function onMouseLeave() {
    ghostPos = null;
    stopDrawing();
}

function stopDrawing() {
    if (!drawing || !currentLine) return;
    drawing = false;

    const dx = currentLine.x2 - currentLine.x1;
    const dy = currentLine.y2 - currentLine.y1;
    const dist = Math.hypot(dx, dy);

    if (dist < 8) {
        const cx = mouseDownPos!.x;
        const cy = mouseDownPos!.y;
        currentLine = null;
        mouseDownPos = null;
        tryRotateAt(cx, cy);
        return;
    }

    drawnLines.push(currentLine);

    const midX = (currentLine.x1 + currentLine.x2) / 2;
    const midY = (currentLine.y1 + currentLine.y2) / 2;
    const len = dist;
    const angle = Math.atan2(dy, dx);

    const body = Bodies.rectangle(midX, midY, len, 6, {
        isStatic: true,
        angle,
        render: { visible: false }
    });

    World.add(world, body);
    drawnLineBodies.push(body);
    currentLine = null;
    mouseDownPos = null;

    updateAIContext();
}

// Seesaw beams are excluded from rotation — they rotate via physics only.
function tryRotateAt(x: number, y: number) {
    const point = { x, y };

    const rotatableBodies = [
        ...placedPrefabs
            .flatMap(p => Array.isArray(p.body) ? p.body : [p.body])
            .filter(b => b.label !== 'prefab:seesaw:beam' && b.label !== 'prefab:seesaw:cup'),
        ...drawnLineBodies
    ];

    const hits = Query.point(rotatableBodies, point);
    if (hits.length === 0) return;

    const target = hits[hits.length - 1];
    Body.setAngle(target, target.angle + Math.PI / 2);

    const lineIdx = drawnLineBodies.indexOf(target);
    if (lineIdx !== -1) {
        const line = drawnLines[lineIdx];
        const midX = target.position.x;
        const midY = target.position.y;
        const halfLen = Math.hypot(line.x2 - line.x1, line.y2 - line.y1) / 2;
        const newAngle = target.angle;
        drawnLines[lineIdx] = {
            x1: midX - Math.cos(newAngle) * halfLen,
            y1: midY - Math.sin(newAngle) * halfLen,
            x2: midX + Math.cos(newAngle) * halfLen,
            y2: midY + Math.sin(newAngle) * halfLen,
        };
    }

    updateAIContext();
}

function onCanvasClick(e: MouseEvent) {
    if (physicsGameState.activePrefab) return;
    tryRotateAt(e.offsetX, e.offsetY);
}

function onDragOver(e: DragEvent) {
    if (!physicsGameState.activePrefab) return;
    e.preventDefault();
    const rect = overlayCanvas.getBoundingClientRect();
    ghostPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function onDragLeave() {
    ghostPos = null;
}

function onDrop(e: DragEvent) {
    e.preventDefault();
    ghostPos = null;

    const type = physicsGameState.activePrefab;
    if (!type) return;

    const rect = overlayCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const slot = physicsGameState.inventory.find(i => i.type === type);
    if (!slot || slot.count <= 0) return;
    slot.count--;

    const body = spawnPrefab(world, type, x, y);
    placedPrefabs.push({ type, body });

    // Register seesaw beam (index 0) for angle clamping
    if (type === 'seesaw' && Array.isArray(body)) {
        seesawBeams.push(body[0]);
    }

    if (slot.count === 0) {
        physicsGameState.activePrefab = null;
    }

    updateAIContext();
}

function redrawLines() {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    overlayCtx.strokeStyle = "#66ccff";
    overlayCtx.lineWidth = 4;
    overlayCtx.shadowColor = "#66ccff";
    overlayCtx.shadowBlur = 14;

    [...drawnLines, currentLine].forEach((l) => {
        if (!l) return;
        overlayCtx.beginPath();
        overlayCtx.moveTo(l.x1, l.y1);
        overlayCtx.lineTo(l.x2, l.y2);
        overlayCtx.stroke();
    });

    overlayCtx.shadowBlur = 0;

    if (ghostPos && physicsGameState.activePrefab) {
        drawGhost(physicsGameState.activePrefab, ghostPos.x, ghostPos.y);
    }
}

function drawGhost(type: PrefabType, x: number, y: number) {
    overlayCtx.save();
    overlayCtx.globalAlpha = 0.45;
    overlayCtx.translate(x, y);

    switch (type) {
        case 'bridge':
            overlayCtx.fillStyle = '#a0784a';
            overlayCtx.fillRect(-80, -5, 160, 10);
            break;
        case 'bouncepad':
            overlayCtx.fillStyle = '#ff4488';
            overlayCtx.fillRect(-40, -7, 80, 14);
            break;
        case 'ramp':
            overlayCtx.rotate(Math.PI / 6);
            overlayCtx.fillStyle = '#ffaa00';
            overlayCtx.fillRect(-70, -5, 140, 10);
            break;
        case 'bumper':
            overlayCtx.fillStyle = '#8844ff';
            overlayCtx.beginPath();
            overlayCtx.arc(0, 0, 20, 0, Math.PI * 2);
            overlayCtx.fill();
            break;
        case 'seesaw':
            // Triangle base
            overlayCtx.fillStyle = '#889966';
            overlayCtx.beginPath();
            overlayCtx.moveTo(0, 36);
            overlayCtx.lineTo(-12, 0);
            overlayCtx.lineTo(12, 0);
            overlayCtx.closePath();
            overlayCtx.fill();
            // Beam
            overlayCtx.fillStyle = '#c8a06a';
            overlayCtx.fillRect(-110, -6, 220, 12);
            break;
    }

    overlayCtx.restore();
}

function animateBouncePad(pad: Matter.Body) {
    const SQUISH_FRAMES = 4;
    const RECOVER_FRAMES = 8;
    let frame = 0;

    function tick() {
        frame++;
        if (frame <= SQUISH_FRAMES) {
            const t = frame / SQUISH_FRAMES;
            pad.render.fillStyle = interpolateColor('#ff4488', '#ffdd00', t);
        } else if (frame <= SQUISH_FRAMES + RECOVER_FRAMES) {
            const t = (frame - SQUISH_FRAMES) / RECOVER_FRAMES;
            pad.render.fillStyle = interpolateColor('#ffdd00', '#ff4488', t);
        } else {
            pad.render.fillStyle = '#ff4488';
            return;
        }
        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}

function interpolateColor(from: string, to: string, t: number): string {
    const f = parseInt(from.slice(1), 16);
    const e = parseInt(to.slice(1), 16);
    const r = Math.round(((f >> 16) & 0xff) * (1 - t) + ((e >> 16) & 0xff) * t);
    const g = Math.round(((f >> 8) & 0xff) * (1 - t) + ((e >> 8) & 0xff) * t);
    const b = Math.round((f & 0xff) * (1 - t) + (e & 0xff) * t);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function releaseCage() {
    cageWalls.forEach((wall) => World.remove(world, wall));
}

function resetWorld() {
    Render.stop(render);
    Runner.stop(runner);
    World.clear(world, true);
    Engine.clear(engine);

    container.innerHTML = "";
    drawnLines = [];
    drawnLineBodies = [];
    placedPrefabs = [];
    seesawBeams = [];
    ghostPos = null;

    init();
}

export function resetGame() {
    resetWorld();
}

export function levelUp() {
    if (physicsGameState.currentLevelIndex < (levels.length - 1)) {
        physicsGameState.currentLevelIndex++;
        resetGame();
    }
}

export function levelDown() {
    if (physicsGameState.currentLevelIndex > 0) {
        physicsGameState.currentLevelIndex--;
        resetGame();
    }
}

function updateAIContext() {
    uiState.aiContext = buildPhysicsContext();
}

export function buildPhysicsContext() {
    return {
        ball: ball.position,
        goal: goal.position,
        lines: drawnLines,
        placedPrefabs: placedPrefabs.map(p => ({
            type: p.type,
            position: Array.isArray(p.body)
                ? (p.body[0] as Matter.Body).position
                : (p.body as Matter.Body).position
        }))
    };
}
import Matter from "matter-js";
import { untrack } from 'svelte';
import { uiState, physicsGameState } from '$lib/game-ui.svelte';

import {
    createBounds,
    createBallAndCage,
    createGoal,
    createGeometry,
    cageWalls,
    spawnPrefab
} from "./level-creation";

import { levels, type PrefabType } from "./level-data";

const { Engine, World, Render, Runner, Events, Body, Query } = Matter;

const SEESAW_MAX_ANGLE = (40 * Math.PI) / 180;

let engine: Matter.Engine;
let world: Matter.World;
let render: Matter.Render;
let runner: Matter.Runner;

let ball: Matter.Body;
let goal: Matter.Body;

let placedPrefabs: { type: PrefabType; body: Matter.Body | Matter.Body[] }[] = [];
let seesawBeams: Matter.Body[] = [];

let overlayCanvas: HTMLCanvasElement;
let overlayCtx: CanvasRenderingContext2D;

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
    createGeometry(world, level);

    physicsGameState.inventory = level.prefabs.map(p => ({ ...p }));
    physicsGameState.activePrefab = null;

    placedPrefabs = [];
    seesawBeams = [];

    Events.on(engine, "afterUpdate", () => {
        redrawOverlay();
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
                const launchSpeed = Math.max(12, incomingSpeed * 1.5);

                // Normal perpendicular to the pad surface (up for a flat horizontal pad)
                let nx = Math.sin(pad.angle);
                let ny = -Math.cos(pad.angle);

                // Flip so the normal always points toward the ball's side of the pad
                const toBallX = ball.position.x - pad.position.x;
                const toBallY = ball.position.y - pad.position.y;
                if (toBallX * nx + toBallY * ny < 0) { nx = -nx; ny = -ny; }

                // Preserve half the tangential velocity so the ball doesn't dead-stop sideways
                const tx = Math.cos(pad.angle);
                const ty = Math.sin(pad.angle);
                const tangentialSpeed = ball.velocity.x * tx + ball.velocity.y * ty;

                Body.setVelocity(ball, {
                    x: nx * launchSpeed + tx * tangentialSpeed * 0.5,
                    y: ny * launchSpeed + ty * tangentialSpeed * 0.5,
                });
                animateBouncePad(pad);
            }
        });
    });

    updateAIContext();
}

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

    overlayCanvas.addEventListener("mouseleave", () => { ghostPos = null; });
    overlayCanvas.addEventListener("click", onCanvasClick);
    overlayCanvas.addEventListener("dragover", onDragOver);
    overlayCanvas.addEventListener("drop", onDrop);
    overlayCanvas.addEventListener("dragleave", onDragLeave);
}

// Seesaw beams are excluded from rotation — they rotate via physics only.
function tryRotateAt(x: number, y: number) {
    const rotatableBodies = placedPrefabs
        .flatMap(p => Array.isArray(p.body) ? p.body : [p.body])
        .filter(b => b.label !== 'prefab:seesaw:beam' && b.label !== 'prefab:seesaw:cup');

    const hits = Query.point(rotatableBodies, { x, y });
    if (hits.length === 0) return;

    Body.setAngle(hits[hits.length - 1], hits[hits.length - 1].angle + Math.PI / 2);
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

    if (type === 'seesaw' && Array.isArray(body)) {
        seesawBeams.push(body[0]);
    }

    if (slot.count === 0) {
        physicsGameState.activePrefab = null;
    }

    updateAIContext();
}

function redrawOverlay() {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

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
            overlayCtx.fillStyle = '#889966';
            overlayCtx.beginPath();
            overlayCtx.moveTo(0, 36);
            overlayCtx.lineTo(-12, 0);
            overlayCtx.lineTo(12, 0);
            overlayCtx.closePath();
            overlayCtx.fill();
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
    untrack(() => { uiState.aiContext = buildPhysicsContext(); });
}

export function buildPhysicsContext() {
    const level = levels[physicsGameState.currentLevelIndex];
    return {
        ball: ball.position,
        goal: goal.position,
        placedPrefabs: placedPrefabs.map(p => ({
            type: p.type,
            position: Array.isArray(p.body)
                ? (p.body[0] as Matter.Body).position
                : (p.body as Matter.Body).position
        })),
        inventory: physicsGameState.inventory.map(i => ({ type: i.type, remaining: i.count })),
        solution: level.solution ?? '',
    };
}

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

// Tracks the physics body for each drawn line so we can rotate it on click
let drawnLineBodies: Matter.Body[] = [];

let overlayCanvas: HTMLCanvasElement;
let overlayCtx: CanvasRenderingContext2D;

let drawing = false;
let currentLine: { x1: number; y1: number; x2: number; y2: number } | null = null;

// Store mousedown position to distinguish a click from a drag
let mouseDownPos: { x: number; y: number } | null = null;

// Ghost preview position while dragging a prefab over the canvas
let ghostPos: { x: number; y: number } | null = null;

let container: HTMLElement;
let onGoalReached: (() => void) | null = null;

// ENTRY POINT
export function startGame(
    targetContainer: HTMLElement,
    options: { onGoal?: () => void } = {}
) {
    container = targetContainer;
    onGoalReached = options.onGoal || null;
    init();
}

// INITIALIZATION
function init() {
    engine = Engine.create();
    engine.gravity.y = 2;
    world = engine.world;

    const w = container.clientWidth;
    const h = container.clientHeight;
    console.log("Size:", w, h);

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

    // Initialise inventory from level config
    physicsGameState.inventory = level.prefabs.map(p => ({ ...p }));
    physicsGameState.activePrefab = null;

    placedPrefabs = [];

    Events.on(engine, "afterUpdate", redrawLines);

    Events.on(engine, "collisionStart", (event) => {
        event.pairs.forEach(({ bodyA, bodyB }) => {
            if (
                (bodyA === ball && bodyB === goal) ||
                (bodyA === goal && bodyB === ball)
            ) {
                if (onGoalReached) onGoalReached();
            }
        });
    });

    updateAIContext();
}

// OVERLAY DRAWING
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

    // Line drawing
    if (physicsGameState.currentLevelIndex == 3){
    overlayCanvas.addEventListener("mousedown", startDrawing);
    overlayCanvas.addEventListener("mousemove", onMouseMove);
    overlayCanvas.addEventListener("mouseup", stopDrawing);
    overlayCanvas.addEventListener("mouseleave", onMouseLeave);
    }
    overlayCanvas.addEventListener("click", onCanvasClick);

    // Prefab drag-and-drop (dragover / drop come from the inventory panel)
    overlayCanvas.addEventListener("dragover", onDragOver);
    overlayCanvas.addEventListener("drop", onDrop);
    overlayCanvas.addEventListener("dragleave", onDragLeave);
}

// LINE DRAWING
function startDrawing(e: MouseEvent) {
    if (physicsGameState.activePrefab || physicsGameState.currentLevelIndex >= levels.length) {
        return;
    }
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

    // Short movement = treat as a click, not a line draw
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

// CLICK-TO-ROTATE
// Uses Matter.Query to find bodies at the click point, then rotates 90 degrees.
// Works for both placed prefabs and drawn line bodies.
function tryRotateAt(x: number, y: number) {
    const point = { x, y };

    // Collect all rotatable bodies
    const rotatableBodies = [
        ...placedPrefabs.flatMap(p => Array.isArray(p.body) ? p.body : [p.body]),
        ...drawnLineBodies
    ];

    const hits = Query.point(rotatableBodies, point);
    if (hits.length === 0) return;

    // Rotate the topmost hit (last added wins)
    const target = hits[hits.length - 1];
    Body.setAngle(target, target.angle + Math.PI / 2);

    // If it was a drawn line, sync the stored line data angle too
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

// Handle clicks when a prefab is the active tool (no line drawing in this mode)
function onCanvasClick(e: MouseEvent) {
    if (physicsGameState.activePrefab) return; // drops are handled via dragover/drop
    tryRotateAt(e.offsetX, e.offsetY);
}
function onDragOver(e: DragEvent) {
    if (!physicsGameState.activePrefab) return;
    e.preventDefault(); // allow drop
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

    // Consume one from inventory
    const slot = physicsGameState.inventory.find(i => i.type === type);
    if (!slot || slot.count <= 0) return;
    slot.count--;

    const body = spawnPrefab(world, type, x, y);
    placedPrefabs.push({ type, body });

    // Deselect if inventory exhausted
    if (slot.count === 0) {
        physicsGameState.activePrefab = null;
    }

    updateAIContext();
}

// OVERLAY RENDER
function redrawLines() {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Drawn lines
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

    // Ghost prefab preview
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
    }

    overlayCtx.restore();
}

// ACTIONS
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
    ghostPos = null;

    init();
}

export function resetGame() {
    resetWorld();
}

export function levelUp() {
if (physicsGameState.currentLevelIndex < (levels.length-1)){
    physicsGameState.currentLevelIndex++;
    resetGame();
}
}

export function levelDown() {
  if (physicsGameState.currentLevelIndex > 0){
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
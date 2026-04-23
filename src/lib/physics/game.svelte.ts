import Matter from "matter-js";
import { untrack } from 'svelte';
import { uiState, physicsGameState } from '$lib/game-ui.svelte';

import {
    createBounds,
    createBallAndCage,
    createGoal,
    createGeometry,
    cageWalls,
    spawnPrefab,
    pendingSeesawConstraints,
    pendingSeesawPivot
} from "./level-creation";

import { levels, type LevelConfig, type PrefabType } from "./level-data";

const { Engine, World, Render, Runner, Events, Body, Query } = Matter;

const SEESAW_MAX_ANGLE = (65 * Math.PI) / 180;

let engine: Matter.Engine;
let world: Matter.World;
let render: Matter.Render;
let runner: Matter.Runner;

let ball: Matter.Body;
let goal: Matter.Body | null = null;

let drawnBodies: Matter.Body[] = [];
let isSandbox = false;
let sandboxConfig: LevelConfig | null = null;
let sandboxDrawActive = false;
let drawStart: { x: number; y: number } | null = null;
let drawCurrent: { x: number; y: number } | null = null;
let didDraw = false;
let sandboxDragTarget: 'ball' | 'goal' | null = null;
let sandboxDragOffset = { x: 0, y: 0 };
let prefabDragEntry: typeof placedPrefabs[0] | null = null;
let prefabDragOffset = { x: 0, y: 0 };
let prefabDragStartMouse = { x: 0, y: 0 };
let prefabDragMoved = false;
let skipNextClick = false;
let goalTriggered = false;

const SANDBOX_CONFIG: LevelConfig = {
    ball: { x: 350, y: 60 },
    goal: { x: 550, y: 450 },
    prefabs: [
        { type: 'bridge',    count: 15 },
        { type: 'bouncepad', count: 10 },
        { type: 'bumper',    count: 10 },
        { type: 'seesaw',    count: 3  },
    ],
};

let placedPrefabs: { type: PrefabType; body: Matter.Body | Matter.Body[]; constraints?: Matter.Constraint[] }[] = [];
let seesawBeams: Matter.Body[] = [];
let seesawLocks: Matter.Constraint[] = [];
let seesawBallBodies: Matter.Body[] = [];
let seesawLaunched = false;

let overlayCanvas: HTMLCanvasElement;
let overlayCtx: CanvasRenderingContext2D;

let ghostPos: { x: number; y: number } | null = null;

let container: HTMLElement;
let onGoalReached: (() => void) | null = null;
let keydownHandler: ((e: KeyboardEvent) => void) | null = null;

export function startGame(
    targetContainer: HTMLElement,
    options: { onGoal?: () => void } = {}
) {
    container = targetContainer;
    onGoalReached = options.onGoal || null;
    physicsGameState.mode = 'levels';
    uiState.gameType = 'physics';
    uiState.goalReached = false;
    uiState.aiPrompt = '';
    uiState.aiResponse = '';
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

    const config = sandboxConfig ?? levels[physicsGameState.currentLevelIndex];
    ball = createBallAndCage(world, config);
    goal = createGoal(world, config);
    createGeometry(world, config);

    physicsGameState.inventory = config.prefabs.map(p => ({ ...p }));
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
            const isScoring = (b: Matter.Body) => b === ball || b.label === 'prefab:seesaw:ball';
            if (!goalTriggered && goal && (
                (isScoring(bodyA) && bodyB === goal) ||
                (isScoring(bodyB) && bodyA === goal)
            )) {
                goalTriggered = true;
                if (onGoalReached) onGoalReached();
                updateAIContext();
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

            const isSeesawBeam = (b: Matter.Body) => b.label === 'prefab:seesaw:beam';
            if (
                !seesawLaunched &&
                ((bodyA === ball && isSeesawBeam(bodyB)) ||
                 (bodyB === ball && isSeesawBeam(bodyA)))
            ) {
                seesawLaunched = true;
                const impactSpeed = Math.hypot(ball.velocity.x, ball.velocity.y);
                const launchSpeed = Math.max(28, impactSpeed * 1.8);

                setTimeout(() => {
                    for (const sb of seesawBallBodies) {
                        // Determine launch direction from beam angle at fire time
                        const beam = isSeesawBeam(bodyA) ? bodyA : bodyB;
                        // Ball is in the left cup — it launches upward and slightly toward goal
                        const vx = Math.sin(beam.angle) * launchSpeed * 0.4;
                        const vy = -launchSpeed;
                        Body.setVelocity(sb, { x: vx, y: vy });
                    }
                }, 200);
            }
        });
    });

    updateAIContext();
}

function clampSeesaws() {
    for (const beam of seesawBeams) {
        if (beam.angle > SEESAW_MAX_ANGLE) {
            Body.setAngle(beam, SEESAW_MAX_ANGLE);
        } else if (beam.angle < -SEESAW_MAX_ANGLE) {
            Body.setAngle(beam, -SEESAW_MAX_ANGLE);
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

    overlayCanvas.addEventListener("mouseleave", () => { ghostPos = null; drawStart = null; sandboxDragTarget = null; prefabDragEntry = null; });
    overlayCanvas.addEventListener("mousedown", onCanvasMouseDown);
    overlayCanvas.addEventListener("mousemove", onCanvasMouseMove);
    overlayCanvas.addEventListener("mouseup", onCanvasMouseUp);
    overlayCanvas.addEventListener("click", onCanvasClick);
    overlayCanvas.addEventListener("contextmenu", onCanvasRightClick);
    overlayCanvas.addEventListener("dragover", onDragOver);
    overlayCanvas.addEventListener("drop", onDrop);
    overlayCanvas.addEventListener("dragleave", onDragLeave);

    if (keydownHandler) window.removeEventListener("keydown", keydownHandler);
    keydownHandler = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            undoLastPrefab();
        }
    };
    window.addEventListener("keydown", keydownHandler);
}

// Seesaw beams are excluded from rotation — they rotate via physics only.
function tryRotateAt(x: number, y: number) {
    const rotatableBodies = placedPrefabs
        .flatMap(p => Array.isArray(p.body) ? p.body : [p.body])
        .filter(b => !b.label.startsWith('prefab:seesaw:'));

    const hits = Query.point(rotatableBodies, { x, y });
    if (hits.length === 0) return;

    const body = hits[hits.length - 1];
    Body.setAngle(body, body.angle + Math.PI / 4);
    updateAIContext();
}

function isInteractionLocked() {
    return !isSandbox && physicsGameState.cageReleased;
}

function onCanvasMouseDown(e: MouseEvent) {
    if (isInteractionLocked()) return;
    if (sandboxDrawActive) {
        e.preventDefault();
        drawStart = { x: e.offsetX, y: e.offsetY };
        drawCurrent = { x: e.offsetX, y: e.offsetY };
        didDraw = false;
        return;
    }
    if (!physicsGameState.activePrefab) {
        const pt = { x: e.offsetX, y: e.offsetY };

        // Sandbox-only: drag ball or goal
        if (isSandbox) {
            if (Query.point([ball], pt).length > 0) {
                sandboxDragTarget = 'ball';
                sandboxDragOffset = { x: e.offsetX - ball.position.x, y: e.offsetY - ball.position.y };
                e.preventDefault();
                return;
            }
            if (goal && Query.point([goal], pt).length > 0) {
                sandboxDragTarget = 'goal';
                sandboxDragOffset = { x: e.offsetX - goal.position.x, y: e.offsetY - goal.position.y };
                e.preventDefault();
                return;
            }
        }

        // Any mode: drag placed prefabs
        const allPlaced = placedPrefabs.flatMap(p => Array.isArray(p.body) ? p.body : [p.body]);
        const hits = Query.point(allPlaced, pt);
        if (hits.length > 0) {
            const hitBody = hits[hits.length - 1];
            const entry = placedPrefabs.find(p => {
                const bodies = Array.isArray(p.body) ? p.body : [p.body];
                return bodies.some(b => b === hitBody || (b.parts && b.parts.includes(hitBody)));
            });
            if (entry) {
                const primary = (Array.isArray(entry.body) ? entry.body[0] : entry.body) as Matter.Body;
                prefabDragEntry = entry;
                prefabDragOffset = { x: e.offsetX - primary.position.x, y: e.offsetY - primary.position.y };
                prefabDragStartMouse = { x: e.offsetX, y: e.offsetY };
                prefabDragMoved = false;
                e.preventDefault();
            }
        }
    }
}

function onCanvasMouseMove(e: MouseEvent) {
    if (sandboxDragTarget) {
        const tx = e.offsetX - sandboxDragOffset.x;
        const ty = e.offsetY - sandboxDragOffset.y;
        if (sandboxDragTarget === 'ball') {
            const dx = tx - ball.position.x;
            const dy = ty - ball.position.y;
            Body.setPosition(ball, { x: tx, y: ty });
            Body.setVelocity(ball, { x: 0, y: 0 });
            if (!physicsGameState.cageReleased) {
                for (const w of cageWalls) {
                    Body.setPosition(w, { x: w.position.x + dx, y: w.position.y + dy });
                }
            }
        } else if (sandboxDragTarget === 'goal' && goal) {
            Body.setPosition(goal, { x: tx, y: ty });
        }
        return;
    }
    if (prefabDragEntry) {
        const primary = (Array.isArray(prefabDragEntry.body) ? prefabDragEntry.body[0] : prefabDragEntry.body) as Matter.Body;
        const tx = e.offsetX - prefabDragOffset.x;
        const ty = e.offsetY - prefabDragOffset.y;
        const dx = tx - primary.position.x;
        const dy = ty - primary.position.y;
        if (!prefabDragMoved && Math.hypot(e.offsetX - prefabDragStartMouse.x, e.offsetY - prefabDragStartMouse.y) > 5) {
            prefabDragMoved = true;
        }
        movePrefabEntry(prefabDragEntry, dx, dy);
        return;
    }
    if (sandboxDrawActive && drawStart) {
        drawCurrent = { x: e.offsetX, y: e.offsetY };
        didDraw = Math.hypot(e.offsetX - drawStart.x, e.offsetY - drawStart.y) > 5;
    }
}

function movePrefabEntry(entry: typeof placedPrefabs[0], dx: number, dy: number) {
    const bodies = Array.isArray(entry.body) ? entry.body : [entry.body];
    for (const b of bodies as Matter.Body[]) {
        Body.setPosition(b, { x: b.position.x + dx, y: b.position.y + dy });
        if (!b.isStatic) {
            Body.setVelocity(b, { x: 0, y: 0 });
            Body.setAngularVelocity(b, 0);
        }
    }
    // Update world-space constraint anchors (seesaw pivot, locks)
    for (const c of entry.constraints ?? []) {
        if (c.pointB) { c.pointB.x += dx; c.pointB.y += dy; }
    }
}

function onCanvasMouseUp(e: MouseEvent) {
    if (sandboxDragTarget) {
        sandboxDragTarget = null;
        return;
    }
    if (prefabDragEntry) {
        if (!prefabDragMoved) {
            // Short tap with no movement → rotate
            const primary = (Array.isArray(prefabDragEntry.body) ? prefabDragEntry.body[0] : prefabDragEntry.body) as Matter.Body;
            if (!primary.label.startsWith('prefab:seesaw:')) {
                Body.setAngle(primary, primary.angle + Math.PI / 4);
                updateAIContext();
            }
        }
        prefabDragEntry = null;
        prefabDragMoved = false;
        skipNextClick = true;
        return;
    }
    if (!sandboxDrawActive || !drawStart || !didDraw) {
        drawStart = null;
        drawCurrent = null;
        return;
    }
    const x1 = Math.min(drawStart.x, e.offsetX);
    const y1 = Math.min(drawStart.y, e.offsetY);
    const w  = Math.abs(e.offsetX - drawStart.x);
    const h  = Math.abs(e.offsetY - drawStart.y);
    if (w > 10 && h > 4) {
        const { Bodies: B } = Matter;
        const body = B.rectangle(x1 + w / 2, y1 + h / 2, w, h, {
            isStatic: true,
            label: 'sandbox:drawn',
            render: { fillStyle: '#2d3a4a', strokeStyle: '#4a6a8a', lineWidth: 2 },
        });
        World.add(world, body);
        drawnBodies.push(body);
    }
    drawStart = null;
    drawCurrent = null;
    didDraw = false;
}

function onCanvasClick(e: MouseEvent) {
    if (isInteractionLocked()) return;
    if (skipNextClick) { skipNextClick = false; return; }
    if (physicsGameState.activePrefab) return;
    if (sandboxDrawActive) return;
    tryRotateAt(e.offsetX, e.offsetY);
}

function onCanvasRightClick(e: MouseEvent) {
    e.preventDefault();
    if (isInteractionLocked()) return;
    removePrefabAt(e.offsetX, e.offsetY);
}

function removePrefabAt(x: number, y: number) {
    const allPlaced = placedPrefabs.flatMap(p => Array.isArray(p.body) ? p.body : [p.body]);
    const hits = Query.point([...allPlaced, ...drawnBodies], { x, y });
    if (hits.length === 0) return;

    const hitBody = hits[hits.length - 1];

    const drawnIdx = drawnBodies.indexOf(hitBody);
    if (drawnIdx !== -1) {
        drawnBodies.splice(drawnIdx, 1);
        World.remove(world, hitBody);
        updateAIContext();
        return;
    }

    const idx = placedPrefabs.findIndex(p => {
        const bodies = Array.isArray(p.body) ? p.body : [p.body];
        return bodies.some(b => b === hitBody || (b.parts && b.parts.includes(hitBody)));
    });
    if (idx === -1) return;

    const entry = placedPrefabs.splice(idx, 1)[0];
    const bodies = Array.isArray(entry.body) ? entry.body : [entry.body];
    for (const b of bodies) World.remove(world, b);

    for (const c of entry.constraints ?? []) {
        World.remove(world, c);
        const lockIdx = seesawLocks.indexOf(c);
        if (lockIdx !== -1) seesawLocks.splice(lockIdx, 1);
    }

    if (entry.type === 'seesaw' && Array.isArray(entry.body)) {
        const beam = entry.body[0] as Matter.Body;
        const seesawBall = entry.body[2] as Matter.Body;
        seesawBeams = seesawBeams.filter(b => b !== beam);
        seesawBallBodies = seesawBallBodies.filter(b => b !== seesawBall);
    }

    const slot = physicsGameState.inventory.find(i => i.type === entry.type);
    if (slot) slot.count++;

    updateAIContext();
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
    if (isInteractionLocked()) return;

    const type = physicsGameState.activePrefab;
    if (!type) return;

    const rect = overlayCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const slot = physicsGameState.inventory.find(i => i.type === type);
    if (!slot || slot.count <= 0) return;
    slot.count--;

    const body = spawnPrefab(world, type, x, y);

    if (type === 'seesaw' && Array.isArray(body)) {
        seesawBeams.push(body[0]);
        seesawBallBodies.push(body[2] as Matter.Body);
        seesawLocks.push(...pendingSeesawConstraints);
        placedPrefabs.push({ type, body, constraints: [pendingSeesawPivot!, ...pendingSeesawConstraints] });
    } else {
        placedPrefabs.push({ type, body });
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

    if (sandboxDrawActive && drawStart && drawCurrent) {
        const x = Math.min(drawStart.x, drawCurrent.x);
        const y = Math.min(drawStart.y, drawCurrent.y);
        const w = Math.abs(drawCurrent.x - drawStart.x);
        const h = Math.abs(drawCurrent.y - drawStart.y);
        overlayCtx.save();
        overlayCtx.globalAlpha = 0.45;
        overlayCtx.fillStyle = '#2d3a4a';
        overlayCtx.fillRect(x, y, w, h);
        overlayCtx.globalAlpha = 0.9;
        overlayCtx.strokeStyle = '#66aaff';
        overlayCtx.lineWidth = 2;
        overlayCtx.setLineDash([5, 3]);
        overlayCtx.strokeRect(x, y, w, h);
        overlayCtx.restore();
    }
}

const GHOST_LABELS: Record<PrefabType, string> = {
    bridge: 'Bridge',
    bouncepad: 'Bounce Pad',
    bumper: 'Bumper',
    seesaw: 'Seesaw',
};

function drawGhost(type: PrefabType, x: number, y: number) {
    overlayCtx.save();
    overlayCtx.globalAlpha = 0.5;
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
        case 'bumper':
            overlayCtx.fillStyle = '#8844ff';
            overlayCtx.beginPath();
            overlayCtx.arc(0, 0, 60, 0, Math.PI * 2);
            overlayCtx.fill();
            break;
        case 'seesaw': {
            // Base triangle below beam
            overlayCtx.fillStyle = '#889966';
            overlayCtx.beginPath();
            overlayCtx.moveTo(0, 10);
            overlayCtx.lineTo(-26, 62);
            overlayCtx.lineTo(26, 62);
            overlayCtx.closePath();
            overlayCtx.fill();
            // Beam
            overlayCtx.fillStyle = '#c8a06a';
            overlayCtx.fillRect(-120, -10, 240, 20);
            // Left cup wall
            overlayCtx.fillRect(-120, -42, 12, 32);
            // Right cup wall
            overlayCtx.fillRect(108, -42, 12, 32);
            // Yellow ball in left cup
            overlayCtx.fillStyle = '#ffdd44';
            overlayCtx.beginPath();
            overlayCtx.arc(-82, -21, 11, 0, Math.PI * 2);
            overlayCtx.fill();
            break;
        }
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

export function undoLastPrefab() {
    if (isInteractionLocked()) return;
    const entry = placedPrefabs.pop();
    if (!entry) return;

    const bodies = Array.isArray(entry.body) ? entry.body : [entry.body];
    for (const b of bodies) World.remove(world, b);

    for (const c of entry.constraints ?? []) {
        World.remove(world, c);
        const idx = seesawLocks.indexOf(c);
        if (idx !== -1) seesawLocks.splice(idx, 1);
    }

    if (entry.type === 'seesaw' && Array.isArray(entry.body)) {
        const beam = entry.body[0] as Matter.Body;
        const seesawBall = entry.body[2] as Matter.Body;
        seesawBeams = seesawBeams.filter(b => b !== beam);
        seesawBallBodies = seesawBallBodies.filter(b => b !== seesawBall);
    }

    const slot = physicsGameState.inventory.find(i => i.type === entry.type);
    if (slot) slot.count++;

    updateAIContext();
}

export function releaseCage() {
    cageWalls.forEach((wall) => World.remove(world, wall));
    seesawLocks.forEach((c) => World.remove(world, c));
    seesawLocks = [];
    physicsGameState.cageReleased = true;
}

export function resetBall() {
    World.remove(world, ball);
    cageWalls.forEach((wall) => World.remove(world, wall));
    const config = sandboxConfig ?? levels[physicsGameState.currentLevelIndex];
    ball = createBallAndCage(world, config);
    seesawLaunched = false;
    goalTriggered = false;
    physicsGameState.cageReleased = false;
    updateAIContext();
}

function resetWorld() {
    Render.stop(render);
    Runner.stop(runner);
    World.clear(world, true);
    Engine.clear(engine);

    container.innerHTML = "";
    placedPrefabs = [];
    drawnBodies = [];
    seesawBeams = [];
    seesawLocks = [];
    seesawBallBodies = [];
    seesawLaunched = false;
    ghostPos = null;
    drawStart = null;
    drawCurrent = null;
    sandboxDragTarget = null;
    prefabDragEntry = null;
    prefabDragMoved = false;
    goalTriggered = false;
    physicsGameState.cageReleased = false;

    init();
}

export function resetGame() {
    resetWorld();
}

export function startSandbox(
    targetContainer: HTMLElement,
    options: { onGoal?: () => void } = {}
) {
    container = targetContainer;
    onGoalReached = options.onGoal || null;
    isSandbox = true;
    physicsGameState.mode = 'sandbox';
    sandboxConfig = { ...SANDBOX_CONFIG, prefabs: SANDBOX_CONFIG.prefabs.map(p => ({ ...p })) };
    init();
}

export function clearAllPrefabs() {
    for (const entry of placedPrefabs) {
        const bodies = Array.isArray(entry.body) ? entry.body : [entry.body];
        for (const b of bodies) World.remove(world, b);
        for (const c of entry.constraints ?? []) World.remove(world, c);
    }
    for (const b of drawnBodies) World.remove(world, b);
    placedPrefabs = [];
    drawnBodies = [];
    seesawBeams = [];
    seesawBallBodies = [];
    seesawLocks = [];
    sandboxConfig = { ...SANDBOX_CONFIG, prefabs: SANDBOX_CONFIG.prefabs.map(p => ({ ...p })) };
    physicsGameState.inventory = sandboxConfig.prefabs.map(p => ({ ...p }));
    updateAIContext();
}

export function setSandboxDrawMode(active: boolean) {
    sandboxDrawActive = active;
    physicsGameState.sandboxDrawActive = active;
    overlayCanvas.style.cursor = active ? 'crosshair' : 'default';
    if (!active) { drawStart = null; drawCurrent = null; }
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
    const config = sandboxConfig ?? levels[physicsGameState.currentLevelIndex];
    return {
        mode: isSandbox ? 'sandbox' : 'levels',
        goalReached: goalTriggered,
        ball: ball.position,
        goal: goal?.position ?? null,
        placedPrefabs: placedPrefabs.map(p => {
            const primary = (Array.isArray(p.body) ? p.body[0] : p.body) as Matter.Body;
            return {
                type: p.type,
                position: primary.position,
                angleDeg: Math.round(primary.angle * (180 / Math.PI)),
            };
        }),
        inventory: physicsGameState.inventory.map(i => ({ type: i.type, remaining: i.count })),
        solution: config.solution ?? '',
    };
}

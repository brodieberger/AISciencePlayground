import Matter from "matter-js";
import type { LevelConfig, PrefabType } from "./level-data";

const { World, Bodies, Body, Constraint } = Matter;

const GEO_FILL = '#2d3a4a';
const GEO_STROKE = '#4a5a6a';

export function createGeometry(world: Matter.World, level: LevelConfig): Matter.Body[] {
    if (!level.geometry) return [];

    const bodies: Matter.Body[] = [];

    for (const g of level.geometry) {
        const style = {
            isStatic: true,
            label: 'geometry',
            render: {
                fillStyle: g.color ?? GEO_FILL,
                strokeStyle: GEO_STROKE,
                lineWidth: 2,
            },
        };

        let body: Matter.Body;
        if (g.type === 'rect') {
            body = Bodies.rectangle(g.x, g.y, g.w, g.h, {
                ...style,
                angle: g.angle ?? 0,
            });
        } else {
            body = Bodies.circle(g.x, g.y, g.r, style);
        }

        bodies.push(body);
    }

    World.add(world, bodies);
    return bodies;
}

export let cageWalls: Matter.Body[] = [];

export function createBounds(world: Matter.World, w: number, h: number) {
    const t = 50;

    const bounds = [
        Bodies.rectangle(w / 2, h + t / 2, w, t, { isStatic: true }),
        Bodies.rectangle(-t / 2, h / 2, t, h, { isStatic: true }),
        Bodies.rectangle(w + t / 2, h / 2, t, h, { isStatic: true })
    ];

    World.add(world, bounds);
    return bounds;
}

export function createBallAndCage(world: Matter.World, level: LevelConfig) {
    const { x, y } = level.ball;
    const size = 40;
    const thickness = 6;

    const ball = Bodies.circle(x, y, 14, {
        restitution: 0.85,
        density: 0.05,
        friction: 0.0001,
        frictionAir: 0.004,
        frictionStatic: 0,
        render: { fillStyle: "#ffffff" },
        label: "Main Ball"
    });

    cageWalls = [
        Bodies.rectangle(x, y - size / 2, size, thickness, cageStyle()),
        Bodies.rectangle(x, y + size / 2, size, thickness, cageStyle()),
        Bodies.rectangle(x - size / 2, y, thickness, size, cageStyle()),
        Bodies.rectangle(x + size / 2, y, thickness, size, cageStyle())
    ];

    World.add(world, [ball, ...cageWalls]);
    return ball;
}

function cageStyle() {
    return {
        isStatic: true,
        render: {
            fillStyle: "#00ffff",
            strokeStyle: "#99ffff",
            lineWidth: 2
        }
    };
}

export function createGoal(world: Matter.World, level: LevelConfig) {
    const { x, y } = level.goal;
    const goal = Bodies.rectangle(x, y, 80, 20, {
        isStatic: true,
        render: { fillStyle: "#00ff88" }
    });

    World.add(world, goal);
    return goal;
}

// --- Prefab factories ---

export type SpawnResult = Matter.Body | Matter.Body[];

export function spawnPrefab(
    world: Matter.World,
    type: PrefabType,
    x: number,
    y: number
): SpawnResult {
    switch (type) {
        case 'bridge':    return spawnBridge(world, x, y);
        case 'bouncepad': return spawnBouncePad(world, x, y);
        case 'ramp':      return spawnRamp(world, x, y);
        case 'bumper':    return spawnBumper(world, x, y);
        case 'seesaw':    return spawnSeesaw(world, x, y);
    }
}

// A long flat static platform
function spawnBridge(world: Matter.World, x: number, y: number): Matter.Body {
    const body = Bodies.rectangle(x, y, 160, 10, {
        isStatic: true,
        label: 'prefab:bridge',
        render: { fillStyle: '#a0784a', strokeStyle: '#c8a06a', lineWidth: 2 }
    });
    World.add(world, body);
    return body;
}

// Bouncepad: launches the ball via applyForce in game.svelte.ts on collision.
// Restitution is 0 — the impulse is fully controlled in code so the launch
// feels consistent regardless of how fast the ball arrives.
function spawnBouncePad(world: Matter.World, x: number, y: number): Matter.Body {
    const body = Bodies.rectangle(x, y, 90, 14, {
        isStatic: true,
        restitution: 0,
        friction: 0,
        label: 'prefab:bouncepad',
        render: { fillStyle: '#ff4488', strokeStyle: '#ff88bb', lineWidth: 2 }
    });
    World.add(world, body);
    return body;
}

// An angled ramp (30 degrees)
function spawnRamp(world: Matter.World, x: number, y: number): Matter.Body {
    const body = Bodies.rectangle(x, y, 140, 10, {
        isStatic: true,
        angle: Math.PI / 6,
        label: 'prefab:ramp',
        render: { fillStyle: '#ffaa00', strokeStyle: '#ffcc44', lineWidth: 2 }
    });
    World.add(world, body);
    return body;
}

// A circular bumper that deflects the ball
function spawnBumper(world: Matter.World, x: number, y: number): Matter.Body {
    const body = Bodies.circle(x, y, 20, {
        isStatic: true,
        label: 'prefab:bumper',
        restitution: 1.8,
        render: { fillStyle: '#8844ff', strokeStyle: '#bb88ff', lineWidth: 2 }
    });
    World.add(world, body);
    return body;
}

// pendingSeesawConstraints = [rotLock, ballLock] — removed on cage release.
// pendingSeesawPivot = permanent pivot — stored separately for undo.
export let pendingSeesawConstraints: Matter.Constraint[] = [];
export let pendingSeesawPivot: Matter.Constraint | null = null;

// Seesaw: a compound beam (beam + two cup walls at beam ends) pinned at its
// centroid. Locked in place via removable constraints until releaseCage() fires.
// Avoids isStatic toggling on compound bodies, which is unreliable in Matter.js.
function spawnSeesaw(world: Matter.World, x: number, y: number): Matter.Body[] {
    const beamW = 240;
    const beamH = 20;
    const wallW = 12;
    const wallH = 32;
    // Walls sit at the very ends of the beam — NOT at the ball position
    const wallOffX = beamW / 2 - wallW / 2; // 114px from center
    const ballOffX = 82;                     // ball 82px from center, clear of walls
    const wallY = y - beamH / 2 - wallH / 2;

    const woodStyle = { fillStyle: '#c8a06a', strokeStyle: '#e0c080', lineWidth: 2 };

    const beamPart  = Bodies.rectangle(x,             y,     beamW, beamH, { render: woodStyle });
    const leftWall  = Bodies.rectangle(x - wallOffX,  wallY, wallW, wallH, { render: woodStyle });
    const rightWall = Bodies.rectangle(x + wallOffX,  wallY, wallW, wallH, { render: woodStyle });

    const beam = Body.create({
        parts: [beamPart, leftWall, rightWall],
        isStatic: false,
        label: 'prefab:seesaw:beam',
        density: 0.0003,
        frictionAir: 0.006,
        restitution: 0.05,
        friction: 0.1,
    });

    // Permanent pivot — pins beam centroid to its placed world position
    const pivot = Constraint.create({
        bodyA: beam,
        pointA: { x: 0, y: 0 },
        pointB: { x: beam.position.x, y: beam.position.y },
        length: 0,
        stiffness: 1,
        render: { visible: false }
    });

    // Rotation lock — a second constraint 40px above centroid prevents any
    // rotation until removed. Removed by releaseCage() in game.svelte.ts.
    const rotLock = Constraint.create({
        bodyA: beam,
        pointA: { x: 0, y: -40 },
        pointB: { x: beam.position.x, y: beam.position.y - 40 },
        length: 0,
        stiffness: 1,
        render: { visible: false }
    });

    const base = Bodies.trapezoid(x, y + beamH / 2 + 28, 14, 52, 1, {
        isStatic: true,
        label: 'prefab:seesaw:base',
        render: { fillStyle: '#889966', strokeStyle: '#aabb77', lineWidth: 2 }
    });

    // Yellow ball pre-seated in the left cup — also pinned until release
    const ballR = 11;
    const seesawBall = Bodies.circle(x - ballOffX, y - beamH / 2 - ballR, ballR, {
        restitution: 0.35,
        friction: 0.02,
        frictionAir: 0.005,
        density: 0.001,
        label: 'prefab:seesaw:ball',
        render: { fillStyle: '#ffdd44', strokeStyle: '#ffee88', lineWidth: 2 }
    });

    const ballLock = Constraint.create({
        bodyA: seesawBall,
        pointA: { x: 0, y: 0 },
        pointB: { x: seesawBall.position.x, y: seesawBall.position.y },
        length: 0,
        stiffness: 1,
        render: { visible: false }
    });

    pendingSeesawPivot = pivot;
    pendingSeesawConstraints = [rotLock, ballLock];
    World.add(world, [base, beam, pivot, rotLock, seesawBall, ballLock]);

    // beam at index 0 — game.svelte.ts uses this for angle clamping
    return [beam, base, seesawBall];
}
import Matter from "matter-js";
import type { LevelConfig, PrefabType } from "./level-data";

const { World, Bodies, Body, Constraint } = Matter;

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
        restitution: 0.8,
        mass: 5,
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

// Seesaw: a dynamic beam pinned at its center to a static triangle base.
// Returns all bodies so game.svelte.ts can register the beam for angle clamping.
// The left cup starts with a resting ball; the player drops weight on the right
// side to tip it and launch that ball toward the goal.
export interface SeesawBodies {
    beam: Matter.Body;
    base: Matter.Body;
    constraint: Matter.Constraint;
    seesawBall: Matter.Body;
}

function spawnSeesaw(world: Matter.World, x: number, y: number): Matter.Body[] {
    const beamW = 220;
    const beamH = 12;
    const pivotOffsetY = 36; // distance from beam center down to triangle tip

    // Static triangle base — visual only, built from a thin tall rectangle
    // topped by a polygon approximation using a narrow trapezoid stack
    const baseH = pivotOffsetY;
    const base = Bodies.trapezoid(x, y + pivotOffsetY / 2, 10, baseH, 1, {
        isStatic: true,
        label: 'prefab:seesaw:base',
        render: { fillStyle: '#889966', strokeStyle: '#aabb77', lineWidth: 2 }
    });

    // Dynamic beam — free to rotate, pinned by constraint below
    const beam = Bodies.rectangle(x, y, beamW, beamH, {
        isStatic: false,
        label: 'prefab:seesaw:beam',
        frictionAir: 0.015,   // slight air resistance so it doesn't oscillate forever
        restitution: 0.1,
        render: { fillStyle: '#c8a06a', strokeStyle: '#e0c080', lineWidth: 2 }
    });

    // Pin the beam's center to the top of the triangle
    const pivot = Constraint.create({
        bodyA: beam,
        pointA: { x: 0, y: 0 },           // beam center
        pointB: { x, y },                  // world position of pivot
        length: 0,
        stiffness: 1,
        render: { visible: false }
    });

    // Cup walls — four thin static bodies acting as left and right cups.
    // They are separate static bodies; the beam angle clamp in game.svelte.ts
    // keeps the seesaw from flipping so the cups stay useful.
    const cupH = 18;
    const cupW = 6;
    const armOffset = beamW / 2 - 20; // how far along the beam each cup sits

    const leftWallL  = Bodies.rectangle(x - armOffset - 12, y - cupH / 2, cupW, cupH, cupWallStyle());
    const leftWallR  = Bodies.rectangle(x - armOffset + 12, y - cupH / 2, cupW, cupH, cupWallStyle());
    const rightWallL = Bodies.rectangle(x + armOffset - 12, y - cupH / 2, cupW, cupH, cupWallStyle());
    const rightWallR = Bodies.rectangle(x + armOffset + 12, y - cupH / 2, cupW, cupH, cupWallStyle());

    // Ball pre-seated in the left cup
    const seesawBall = Bodies.circle(x - armOffset, y - beamH / 2 - 14, 12, {
        restitution: 0.4,
        label: 'prefab:seesaw:ball',
        render: { fillStyle: '#ffdd44', strokeStyle: '#ffee88', lineWidth: 2 }
    });

    World.add(world, [base, beam, pivot, leftWallL, rightWallR, seesawBall]);

    // Return beam first — game.svelte.ts uses index 0 to identify it for clamping
    return [beam, base, leftWallL, leftWallR, rightWallL, rightWallR, seesawBall];
}

function cupWallStyle() {
    return {
        isStatic: true,
        label: 'prefab:seesaw:cup',
        render: { fillStyle: '#c8a06a', strokeStyle: '#e0c080', lineWidth: 2 }
    };
}
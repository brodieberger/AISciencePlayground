import Matter from "matter-js";
import type { LevelConfig, PrefabType } from "./level-data";

const { World, Bodies } = Matter;

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

export function spawnPrefab(
    world: Matter.World,
    type: PrefabType,
    x: number,
    y: number
): Matter.Body | Matter.Body[] {
    switch (type) {
        case 'bridge':   return spawnBridge(world, x, y);
        case 'bouncepad': return spawnBouncePad(world, x, y);
        case 'ramp':     return spawnRamp(world, x, y);
        case 'bumper':   return spawnBumper(world, x, y);
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
import Matter from "matter-js";
import type { LevelConfig } from "./level-data";

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

export function createBallAndCage(
    world: Matter.World,
    level: LevelConfig
) {
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
export function createGoal(
    world: Matter.World,
    level: LevelConfig
) {
    const { x, y } = level.goal;
    const goal = Bodies.rectangle(
        x,
        y,
        80,
        20, {
        isStatic: true,
        render: { fillStyle: "#00ff88" }
    });

    World.add(world, goal);
    return goal;
}
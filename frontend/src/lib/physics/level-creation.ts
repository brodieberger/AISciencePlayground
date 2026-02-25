import Matter from "matter-js";

const { World, Bodies, Body } = Matter;

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

export function createBallAndCage(world: Matter.World, w: number, h: number) {
  const cx = w * 0.25;
  const cy = h * 0.25;
  const size = 80;
  const thickness = 6;

  const ball = Bodies.circle(cx, cy, 14, {
    restitution: 0.8,
    render: { fillStyle: "#ffffff" }
  });

  cageWalls = [
    Bodies.rectangle(cx, cy - size / 2, size, thickness, cageStyle()),
    Bodies.rectangle(cx, cy + size / 2, size, thickness, cageStyle()),
    Bodies.rectangle(cx - size / 2, cy, thickness, size, cageStyle()),
    Bodies.rectangle(cx + size / 2, cy, thickness, size, cageStyle())
  ];

  World.add(world, [ball, ...cageWalls]);
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

export function createGoal(world: Matter.World, w: number, h: number) {
  const goal = Bodies.rectangle(w * 0.75, h * 0.85, 80, 20, {
    isStatic: true,
    render: { fillStyle: "#00ff88" }
  });

  World.add(world, goal);
}
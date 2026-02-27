import Matter from "matter-js";

import {
  createBounds,
  createBallAndCage,
  createGoal,
  cageWalls
} from "./level-creation";

import { levels } from "./level-data";

const { Engine, World, Render, Runner, Bodies, Events, Body } = Matter;

let engine: Matter.Engine;
let world: Matter.World;
let render: Matter.Render;
let runner: Matter.Runner;

let ball: Matter.Body;
let goal: Matter.Body;

export const gameState = $state({
  currentLevelIndex: 0
});

let drawnLines: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}[] = [];

let overlayCanvas: HTMLCanvasElement;
let overlayCtx: CanvasRenderingContext2D;

let drawing = false;
let currentLine:
  | {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }
  | null = null;

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

  let level = levels[gameState.currentLevelIndex];
  ball = createBallAndCage(world, level);
  goal = createGoal(world, level);

  Events.on(engine, "afterUpdate", redrawLines);

  Events.on(engine, "collisionStart", (event) => {
    event.pairs.forEach(({ bodyA, bodyB }) => {
      if (
        (bodyA === ball && bodyB === goal) ||
        (bodyA === goal && bodyB === ball)
      ) {
        if (onGoalReached) {
          onGoalReached();
        }
      }
    });
  });
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

  overlayCanvas.addEventListener("mousedown", startDrawing);
  overlayCanvas.addEventListener("mousemove", drawLine);
  overlayCanvas.addEventListener("mouseup", stopDrawing);
  overlayCanvas.addEventListener("mouseleave", stopDrawing);
}

function startDrawing(e: MouseEvent) {
  drawing = true;
  currentLine = {
    x1: e.offsetX,
    y1: e.offsetY,
    x2: e.offsetX,
    y2: e.offsetY
  };
}

function drawLine(e: MouseEvent) {
  if (!drawing || !currentLine) return;
  currentLine.x2 = e.offsetX;
  currentLine.y2 = e.offsetY;
}

function stopDrawing() {
  if (!drawing || !currentLine) return;
  drawing = false;

  drawnLines.push(currentLine);

  const midX = (currentLine.x1 + currentLine.x2) / 2;
  const midY = (currentLine.y1 + currentLine.y2) / 2;
  const len = Math.hypot(
    currentLine.x2 - currentLine.x1,
    currentLine.y2 - currentLine.y1
  );
  const angle = Math.atan2(
    currentLine.y2 - currentLine.y1,
    currentLine.x2 - currentLine.x1
  );

  const body = Bodies.rectangle(midX, midY, len, 6, {
    isStatic: true,
    angle,
    render: { visible: false }
  });

  World.add(world, body);
  currentLine = null;
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

  init();
}

export function resetGame() {
  resetWorld();
}

export function levelUp() {
  gameState.currentLevelIndex++;
  resetGame();
}

// AI REQUEST
export async function askAI(userMessage: string) {
  const payload = {
    user_message: userMessage,
    ball: ball.position,
    goal: goal.position,
    lines: drawnLines
  };

  try {
    const res = await fetch("http://www.brodieberger.com/ai_hint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    return data.reply || "No reply received.";
  } catch (err) {
    console.error("AI request failed:", err);
    return "AI request failed.";
  }
}
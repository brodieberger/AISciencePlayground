// @ts-nocheck
import Matter from "matter-js";
import {
  createBounds,
  createBallAndCage,
  createGoal
} from "./level-creation.js";

const {
  Engine,
  Render,
  Runner,
  World,
  Bodies,
  Events
} = Matter;

let engine, world, render, runner;
let ball, goal;
let cageWalls = [];
let drawnLines = [];

let overlayCanvas, overlayCtx;
let drawing = false;
let currentLine = null;

let container;
let onGoalReached = null;

// ENTRY POINT
export function startGame(targetContainer, options = {}) {
  container = targetContainer;
  onGoalReached = options.onGoal || null;
  init();
}

// INITIALIZATION
function init() {
  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 2;

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
  render.canvas.style.zIndex = 1;

  Render.run(render);
  runner = Runner.create();
  Runner.run(runner, engine);

  setupOverlay(w, h);

  createBounds(world, w, h);

  const ballData = createBallAndCage(world, w, h);
  ball = ballData.ball;
  cageWalls = ballData.cageWalls;

  goal = createGoal(world, w, h);

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
function setupOverlay(w, h) {
  overlayCanvas = document.createElement("canvas");
  overlayCanvas.width = w;
  overlayCanvas.height = h;
  overlayCanvas.style.position = "absolute";
  overlayCanvas.style.top = 0;
  overlayCanvas.style.left = 0;
  overlayCanvas.style.zIndex = 10;

  container.appendChild(overlayCanvas);
  overlayCtx = overlayCanvas.getContext("2d");

  overlayCanvas.addEventListener("mousedown", startDrawing);
  overlayCanvas.addEventListener("mousemove", drawLine);
  overlayCanvas.addEventListener("mouseup", stopDrawing);
  overlayCanvas.addEventListener("mouseleave", stopDrawing);
}

function startDrawing(e) {
  drawing = true;
  currentLine = {
    x1: e.offsetX,
    y1: e.offsetY,
    x2: e.offsetX,
    y2: e.offsetY
  };
}

function drawLine(e) {
  if (!drawing) return;
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
  cageWalls.forEach((w) => World.remove(world, w));
  cageWalls = [];
}

function resetWorld() {
  Render.stop(render);
  Runner.stop(runner);
  World.clear(world);
  Engine.clear(engine);
  container.innerHTML = "";
  drawnLines = [];
  cageWalls = [];
  init();
}

export function resetGame() {
  resetWorld();
}

// AI REQUEST
export async function askAI(userMessage) {
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
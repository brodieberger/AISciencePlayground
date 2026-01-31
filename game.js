document.addEventListener("DOMContentLoaded", () => {
  const {
    Engine,
    Render,
    Runner,
    World,
    Bodies,
    Events
  } = Matter;

  // DOM elements
  const container = document.getElementById("game-container");
  const resetBtn = document.getElementById("resetBtn");
  const askAiBtn = document.getElementById("askAiBtn");
  const aiInput = document.getElementById("aiInput");
  const aiOutput = document.getElementById("aiOutput");
  const releaseBtn = document.getElementById("releaseBtn");

  let engine, world, render, runner;
  let ball, goal;
  let cageWalls = [];
  let drawnLines = [];

  let overlayCanvas, overlayCtx;
  let drawing = false;
  let currentLine = null;

  init();

  //  BUTTONS 
  resetBtn.onclick = resetWorld;
  releaseBtn.onclick = releaseCage;
  askAiBtn.onclick = askAI;

  //  INITIALIZE 
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
    createBounds(w, h);
    createBallAndCage(w, h);
    createGoal(w, h);

    Events.on(engine, "afterUpdate", redrawLines);

    Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach((collision) => {
        const { bodyA, bodyB } = collision;

        if ((bodyA === ball && bodyB === goal) || (bodyA === goal && bodyB === ball)) {
          alert("Congrats you win!");
          resetWorld();
        }
      });
    });
  }

  //  OVERLAY / DRAW 
  function setupOverlay(w, h) {
    overlayCanvas = document.createElement("canvas");
    overlayCanvas.width = w;
    overlayCanvas.height = h;
    overlayCanvas.style.position = "absolute";
    overlayCanvas.style.top = 0;
    overlayCanvas.style.left = 0;
    overlayCanvas.style.zIndex = 10;
    overlayCanvas.style.pointerEvents = "auto";

    container.appendChild(overlayCanvas);
    overlayCtx = overlayCanvas.getContext("2d");

    overlayCanvas.addEventListener("mousedown", startDrawing);
    overlayCanvas.addEventListener("mousemove", drawLine);
    overlayCanvas.addEventListener("mouseup", stopDrawing);
    overlayCanvas.addEventListener("mouseleave", stopDrawing);
  }

  function startDrawing(e) {
    drawing = true;
    currentLine = { x1: e.offsetX, y1: e.offsetY, x2: e.offsetX, y2: e.offsetY };
  }

  function drawLine(e) {
    if (!drawing) return;
    currentLine.x2 = e.offsetX;
    currentLine.y2 = e.offsetY;
  }

  function stopDrawing() {
    if (!drawing) return;
    drawing = false;
    if (!currentLine) return;

    drawnLines.push(currentLine);

    const midX = (currentLine.x1 + currentLine.x2) / 2;
    const midY = (currentLine.y1 + currentLine.y2) / 2;
    const len = Math.hypot(currentLine.x2 - currentLine.x1, currentLine.y2 - currentLine.y1);
    const angle = Math.atan2(currentLine.y2 - currentLine.y1, currentLine.x2 - currentLine.x1);

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

    [...drawnLines, currentLine].forEach(l => {
      if (!l) return;
      overlayCtx.beginPath();
      overlayCtx.moveTo(l.x1, l.y1);
      overlayCtx.lineTo(l.x2, l.y2);
      overlayCtx.stroke();
    });

    overlayCtx.shadowBlur = 0;
  }

  //  WORLD 
  function createBounds(w, h) {
    const t = 50;
    World.add(world, [
      Bodies.rectangle(w / 2, h + t / 2, w, t, { isStatic: true }),
      Bodies.rectangle(-t / 2, h / 2, t, h, { isStatic: true }),
      Bodies.rectangle(w + t / 2, h / 2, t, h, { isStatic: true })
    ]);
  }

  function createBallAndCage(w, h) {
    const cx = w * 0.25;
    const cy = h * 0.25;
    const size = 80;
    const thickness = 6;

    ball = Bodies.circle(cx, cy, 14, {
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

  function createGoal(w, h) {
    goal = Bodies.rectangle(w * 0.75, h * 0.85, 80, 20, {
      isStatic: true,
      render: { fillStyle: "#00ff88" }
    });
    World.add(world, goal);
  }

  // BUTTON FUNCTIONS
  function releaseCage() {
    cageWalls.forEach(w => World.remove(world, w));
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

  // AI FUNCTION 
async function askAI() {
    if (!aiInput) return;
    const payload = {
        user_message: aiInput.value,
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
        console.log("AI response:", data); // debug stuff
        aiOutput.textContent = data.reply || "No reply received.";
    } catch (err) {
        console.error("AI request failed:", err);
        aiOutput.textContent = "AI request failed.";
    }
}

});

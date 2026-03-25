<!-- $lib/circuitry/CircuitryBoard.svelte -->
<script lang="ts">
    import {
        gameState,
        solveCircuit,
        placeComponent,
        removeCell,
        addWireLine,
        removeWiresAtCell,
        toggleSwitch,
        wireKey,
        type ComponentType,
    } from './game.svelte';

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    const CELL = 44;

    // ── Setup ─────────────────────────────────────────────────────────────────
    $effect(() => {
        ctx = canvas.getContext('2d')!;
        const ro = new ResizeObserver(() => {
            canvas.width  = canvas.parentElement!.clientWidth;
            canvas.height = canvas.parentElement!.clientHeight;
            render();
        });
        ro.observe(canvas.parentElement!);
        canvas.width  = canvas.parentElement!.clientWidth;
        canvas.height = canvas.parentElement!.clientHeight;
        render();
        return () => ro.disconnect();
    });

    // Re-render on every state change
    $effect(() => {
        void gameState.poweredEdges;
        void gameState.wires;
        void gameState.components;
        void gameState.wireStart;
        void gameState.mouseCell;
        render();
    });

    // ── Mouse helpers ─────────────────────────────────────────────────────────
    function cellAt(e: MouseEvent): { r: number; c: number } {
        const rect = canvas.getBoundingClientRect();
        return {
            r: Math.floor((e.clientY - rect.top)  / CELL),
            c: Math.floor((e.clientX - rect.left) / CELL),
        };
    }

    function handleClick(e: MouseEvent) {
        const { r, c } = cellAt(e);
        const tool = gameState.currentTool;
        const comp = gameState.components[`${r},${c}`];

        // Always let switch toggle on click, regardless of selected tool
        if (comp?.type === 'switch') {
            toggleSwitch(r, c);
            return;
        }

        if (tool === 'delete') { removeCell(r, c); return; }

        if (tool === 'wire') {
            if (!gameState.wireStart) {
                gameState.wireStart = { r, c };
            } else {
                const { r: sr, c: sc } = gameState.wireStart;
                if (sr !== r || sc !== c) addWireLine(sr, sc, r, c);
                gameState.wireStart = null;
            }
            return;
        }

        if (tool !== 'empty') {
            placeComponent(r, c, tool as Exclude<ComponentType, 'empty'>);
        }
    }

    function handleRightClick(e: MouseEvent) {
        e.preventDefault();
        const { r, c } = cellAt(e);
        if (gameState.currentTool === 'wire') {
            removeWiresAtCell(r, c);
        } else {
            removeCell(r, c);
        }
    }

    function handleMouseMove(e: MouseEvent) {
        gameState.mouseCell = cellAt(e);
    }

    function handleMouseLeave() {
        gameState.mouseCell = null;
    }

    // ── Render ────────────────────────────────────────────────────────────────
    function render() {
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        drawWires();
        drawComponents();
        drawWirePreview();
        drawHover();
    }

    function drawGrid() {
        const cols = Math.ceil(canvas.width  / CELL) + 1;
        const rows = Math.ceil(canvas.height / CELL) + 1;
        ctx.strokeStyle = '#1e2d4a';
        ctx.lineWidth   = 0.5;
        for (let r = 0; r <= rows; r++) {
            ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(canvas.width, r * CELL); ctx.stroke();
        }
        for (let c = 0; c <= cols; c++) {
            ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, canvas.height); ctx.stroke();
        }
        ctx.fillStyle = '#253448';
        for (let r = 0; r <= rows; r++) {
            for (let c = 0; c <= cols; c++) {
                ctx.beginPath(); ctx.arc(c * CELL, r * CELL, 1.5, 0, Math.PI * 2); ctx.fill();
            }
        }
    }

    function drawWires() {
        for (const wk of Object.keys(gameState.wires)) {
            const [r1, c1, r2, c2] = wk.split(',').map(Number);
            const powered = !!gameState.poweredEdges[wk];
            const x1 = c1 * CELL + CELL / 2, y1 = r1 * CELL + CELL / 2;
            const x2 = c2 * CELL + CELL / 2, y2 = r2 * CELL + CELL / 2;
            if (powered) {
                ctx.save();
                ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 10;
                ctx.strokeStyle = '#00ff88'; ctx.lineWidth   = 3;
            } else {
                ctx.strokeStyle = '#3a4a5a'; ctx.lineWidth   = 2;
            }
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            if (powered) ctx.restore();
        }
    }

    function drawComponents() {
        for (const [key, comp] of Object.entries(gameState.components)) {
            const [r, c] = key.split(',').map(Number);
            drawComp(c * CELL + CELL / 2, r * CELL + CELL / 2, comp);
        }
    }

    type Comp = (typeof gameState.components)[string];

    function drawComp(x: number, y: number, comp: Comp) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(comp.rotation * Math.PI / 2);
        switch (comp.type) {
            case 'battery':  drawBattery(comp.powered);              break;
            case 'switch':   drawSwitch(comp.closed, comp.powered);  break;
            case 'light':    drawLight(comp.powered);                break;
            case 'resistor': drawResistor(comp.powered);             break;
            case 'and':      drawGate('AND', comp.powered);          break;
            case 'or':       drawGate('OR',  comp.powered);          break;
            case 'not':      drawGate('NOT', comp.powered);          break;
        }
        ctx.restore();
    }

    function drawBattery(pw: boolean) {
        const col = pw ? '#00ff88' : '#4a8a6a';
        ctx.fillStyle = '#1e3a2a';
        ctx.fillRect(-CELL*.38, -CELL*.18, CELL*.76, CELL*.36);
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.strokeRect(-CELL*.38, -CELL*.18, CELL*.76, CELL*.36);
        // + plate
        ctx.strokeStyle = '#ff6666'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(CELL*.2, -CELL*.12); ctx.lineTo(CELL*.2, CELL*.12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(CELL*.27, 0); ctx.lineTo(CELL*.35, 0); ctx.stroke();
        // − plate
        ctx.strokeStyle = '#6699ff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-CELL*.2, -CELL*.12); ctx.lineTo(-CELL*.2, CELL*.12); ctx.stroke();
        // leads
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-CELL*.38, 0); ctx.lineTo(-CELL*.5, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo( CELL*.38, 0); ctx.lineTo( CELL*.5, 0); ctx.stroke();
        // label
        ctx.fillStyle = col;
        ctx.font = `bold ${Math.round(CELL*.19)}px 'Share Tech Mono',monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('BAT', 0, 0);
    }

    function drawSwitch(closed: boolean, pw: boolean) {
        const col = pw && closed ? '#00ff88' : '#5a7a9a';
        ctx.strokeStyle = col; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-CELL*.5,0); ctx.lineTo(-CELL*.18,0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo( CELL*.18,0); ctx.lineTo( CELL*.5, 0); ctx.stroke();
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(-CELL*.18, 0, 3.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc( CELL*.18, 0, 3.5, 0, Math.PI*2); ctx.fill();
        if (closed) {
            ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-CELL*.18,0); ctx.lineTo(CELL*.18,0); ctx.stroke();
        } else {
            ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-CELL*.18,0); ctx.lineTo(CELL*.12,-CELL*.22); ctx.stroke();
        }
        ctx.fillStyle = closed ? '#00ff88' : '#ffd700';
        ctx.font = `${Math.round(CELL*.17)}px 'Share Tech Mono',monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(closed ? 'ON' : 'OFF', 0, CELL*.3);
    }

    function drawLight(pw: boolean) {
        if (pw) {
            ctx.save();
            ctx.shadowColor = '#ffff44'; ctx.shadowBlur = 22;
            ctx.fillStyle = 'rgba(255,255,100,.12)';
            ctx.beginPath(); ctx.arc(0,0,CELL*.4,0,Math.PI*2); ctx.fill();
            ctx.restore();
        }
        const col = pw ? '#ffff44' : '#3a4a5a';
        ctx.fillStyle   = pw ? 'rgba(255,255,100,.28)' : 'rgba(40,55,70,.35)';
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0,-CELL*.05,CELL*.22,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle   = '#2a3a4a';
        ctx.fillRect(-CELL*.1, CELL*.15, CELL*.2, CELL*.13);
        ctx.strokeStyle = col; ctx.lineWidth = 1.5;
        ctx.strokeRect(-CELL*.1, CELL*.15, CELL*.2, CELL*.13);
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, CELL*.28); ctx.lineTo(0,  CELL*.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,-CELL*.27); ctx.lineTo(0, -CELL*.5); ctx.stroke();
        if (pw) {
            ctx.strokeStyle = '#ffdd00'; ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-CELL*.08, CELL*.05); ctx.lineTo(-CELL*.03,-CELL*.08);
            ctx.lineTo( CELL*.03, CELL*.05); ctx.lineTo( CELL*.08,-CELL*.08);
            ctx.stroke();
        }
    }

    function drawResistor(pw: boolean) {
        const col = pw ? '#00ff88' : '#5a7a9a';
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-CELL*.5,0); ctx.lineTo(-CELL*.28,0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo( CELL*.28,0); ctx.lineTo( CELL*.5, 0); ctx.stroke();
        ctx.fillStyle = '#1e3040';
        ctx.fillRect(-CELL*.28,-CELL*.12,CELL*.56,CELL*.24);
        ctx.strokeRect(-CELL*.28,-CELL*.12,CELL*.56,CELL*.24);
        ctx.strokeStyle = pw ? '#ffd700' : '#4a6a8a'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        const s = CELL*.08; ctx.moveTo(-CELL*.2,0);
        for (let i=0;i<5;i++){
            ctx.lineTo(-CELL*.2+s*(i+.5), i%2===0?-CELL*.07:CELL*.07);
            ctx.lineTo(-CELL*.2+s*(i+1), 0);
        }
        ctx.stroke();
        ctx.fillStyle = col;
        ctx.font = `${Math.round(CELL*.18)}px 'Share Tech Mono',monospace`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('R',0,0);
    }

    function drawGate(type: string, pw: boolean) {
        const col = pw ? '#00ff88' : '#5a7a9a';
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.fillStyle = '#0d1f30';
        if (type === 'AND') {
            ctx.beginPath();
            ctx.moveTo(-CELL*.3,-CELL*.2); ctx.lineTo(0,-CELL*.2);
            ctx.arc(0,0,CELL*.2,-Math.PI/2,Math.PI/2);
            ctx.lineTo(-CELL*.3,CELL*.2); ctx.closePath();
            ctx.fill(); ctx.stroke();
        } else if (type === 'OR') {
            ctx.beginPath();
            ctx.moveTo(-CELL*.3,-CELL*.2);
            ctx.quadraticCurveTo(0,-CELL*.2,CELL*.3,0);
            ctx.quadraticCurveTo(0,CELL*.2,-CELL*.3,CELL*.2);
            ctx.quadraticCurveTo(-CELL*.1,0,-CELL*.3,-CELL*.2);
            ctx.fill(); ctx.stroke();
        } else {
            ctx.beginPath(); ctx.arc(0,0,CELL*.2,0,Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(CELL*.26,0,CELL*.055,0,Math.PI*2); ctx.stroke();
        }
        ctx.fillStyle = col;
        ctx.font = `bold ${Math.round(CELL*.18)}px 'Share Tech Mono',monospace`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(type,0,0);
        ctx.strokeStyle=col; ctx.lineWidth=1.5;
        if (type!=='NOT'){
            ctx.beginPath(); ctx.moveTo(-CELL*.5,-CELL*.12); ctx.lineTo(-CELL*.3,-CELL*.12); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-CELL*.5, CELL*.12); ctx.lineTo(-CELL*.3, CELL*.12); ctx.stroke();
        } else {
            ctx.beginPath(); ctx.moveTo(-CELL*.5,0); ctx.lineTo(-CELL*.2,0); ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(CELL*.3,0); ctx.lineTo(CELL*.5,0); ctx.stroke();
    }

    function drawWirePreview() {
        if (!gameState.wireStart || !gameState.mouseCell || gameState.currentTool !== 'wire') return;
        const { r: sr, c: sc } = gameState.wireStart;
        const { r: mr, c: mc } = gameState.mouseCell;
        const x1=sc*CELL+CELL/2, y1=sr*CELL+CELL/2;
        const x2=mc*CELL+CELL/2, y2=mr*CELL+CELL/2;
        ctx.save();
        ctx.strokeStyle='rgba(0,255,136,.45)'; ctx.lineWidth=2.5;
        ctx.setLineDash([6,4]);
        ctx.beginPath();
        if (sr===mr||sc===mc){ ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); }
        else { ctx.moveTo(x1,y1); ctx.lineTo(x2,y1); ctx.lineTo(x2,y2); }
        ctx.stroke(); ctx.restore();
        ctx.fillStyle='rgba(0,255,136,.7)';
        ctx.beginPath(); ctx.arc(x1,y1,5,0,Math.PI*2); ctx.fill();
    }

    function drawHover() {
        if (!gameState.mouseCell || gameState.currentTool==='wire') return;
        const {r,c}=gameState.mouseCell;
        ctx.strokeStyle='rgba(0,255,136,.28)'; ctx.lineWidth=1;
        ctx.strokeRect(c*CELL+1,r*CELL+1,CELL-2,CELL-2);
        const tool=gameState.currentTool;
        if (!['delete','empty'].includes(tool) && !gameState.components[`${r},${c}`]) {
            ctx.save(); ctx.globalAlpha=.35;
            drawComp(c*CELL+CELL/2, r*CELL+CELL/2, {
                type: tool as any, rotation: gameState.rotation,
                closed: false, powered: false, lit: false,
            });
            ctx.restore();
        }
    }
</script>

<canvas
    bind:this={canvas}
    style="display:block;width:100%;height:100%;cursor:crosshair;"
    onclick={handleClick}
    oncontextmenu={handleRightClick}
    onmousemove={handleMouseMove}
    onmouseleave={handleMouseLeave}
></canvas>

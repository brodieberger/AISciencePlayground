<!-- $lib/circuitry/CircuitryBoard.svelte -->
<script lang="ts">
    import {
        gameState,
        placeCell,
        eraseCell,
        toggleSwitch,
        type ComponentType,
    } from './game.svelte';

    let { selected = $bindable<ComponentType>('wire') }: { selected: ComponentType } = $props();

    // ── Click handlers ────────────────────────────────────────────────────────

    function handleClick(r: number, c: number) {
        const cell = gameState.grid[r]?.[c];
        if (!cell) return;
        if (cell.type === 'switch') { toggleSwitch(r, c); return; }
        if (selected === 'empty') eraseCell(r, c);
        else placeCell(r, c, selected);
    }

    function handleRightClick(e: MouseEvent, r: number, c: number) {
        e.preventDefault();
        eraseCell(r, c);
    }

    // ── Trace helpers ─────────────────────────────────────────────────────────
    // A trace is "live" only when both ends are energised, "lit" when both are lit.
    // This ensures dead-end arms (connected but not in a loop) stay dim.

    type TraceInfo = { dir: string; live: boolean; lit: boolean };

    function traceDirs(r: number, c: number): TraceInfo[] {
        const cell = gameState.grid[r]?.[c];
        if (!cell || cell.type === 'empty') return [];
        const result: TraceInfo[] = [];
        const dirs: [number, number, string][] = [
            [r-1, c, 'north'], [r+1, c, 'south'],
            [r,   c-1, 'west'],  [r,   c+1, 'east'],
        ];
        for (const [nr, nc, dir] of dirs) {
            const n = gameState.grid[nr]?.[nc];
            if (n && n.type !== 'empty') {
                result.push({
                    dir,
                    live: cell.energized && n.energized,
                    lit:  cell.lit && n.lit,
                });
            }
        }
        return result;
    }

    // ── Cell helpers ──────────────────────────────────────────────────────────

    function cellClass(r: number, c: number): string {
        const cell = gameState.grid[r]?.[c];
        if (!cell) return 'cell';
        return [
            'cell',
            cell.type !== 'empty' ? `ct-${cell.type}` : '',
            cell.energized        ? 'energized'        : '',
            cell.lit              ? 'lit'               : '',
        ].filter(Boolean).join(' ');
    }

    function cellLabel(r: number, c: number): string {
        const cell = gameState.grid[r]?.[c];
        if (!cell) return '';
        switch (cell.type) {
            case 'battery':  return '🔋';
            case 'light':    return gameState.grid[r][c].lit ? '💡' : '○';
            case 'switch':   return cell.switchClosed ? 'ON' : 'OFF';
            case 'resistor': return 'R';
            default:         return '';
        }
    }

    let rows = $derived(gameState.grid.length);
    let cols = $derived(gameState.grid[0]?.length ?? 9);
</script>

<div class="board" style="--cols:{cols}; --rows:{rows};">
    {#each gameState.grid as row, r}
        {#each row as _cell, c}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class={cellClass(r, c)}
                role="button"
                tabindex="0"
                onclick={() => handleClick(r, c)}
                onkeydown={(e) => e.key === 'Enter' && handleClick(r, c)}
                oncontextmenu={(e) => handleRightClick(e, r, c)}
            >
                {#if gameState.grid[r][c].type !== 'empty'}
                    {#each traceDirs(r, c) as trace}
                        <span
                            class="trace trace-{trace.dir}"
                            class:t-live={trace.live && !trace.lit}
                            class:t-lit={trace.lit}
                        ></span>
                    {/each}
                    <span
                        class="node"
                        class:n-live={gameState.grid[r][c].energized && !gameState.grid[r][c].lit}
                        class:n-lit={gameState.grid[r][c].lit}
                    ></span>
                {/if}

                {#if cellLabel(r, c)}
                    <span class="lbl">{cellLabel(r, c)}</span>
                {/if}

                {#if gameState.grid[r][c].type === 'light' && gameState.grid[r][c].lit}
                    <span class="glow"></span>
                {/if}
            </div>
        {/each}
    {/each}
</div>

<style>
    /* ── Board ── */
    .board {
        display: grid;
        grid-template-columns: repeat(var(--cols), 1fr);
        grid-template-rows:    repeat(var(--rows), 1fr);
        gap: 2px;
        width: 100%;
        height: 100%;
        padding: 6px;
        box-sizing: border-box;
        background: #090e18;
    }

    /* ── Cell ── */
    .cell {
        position: relative;
        aspect-ratio: 1;
        min-width: 0;
        min-height: 0;
        background: #0b1422;
        border: 1px solid #182438;
        border-radius: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        overflow: hidden;
        transition: border-color .1s, background .1s;
    }
    .cell:hover { border-color: #2a4060; background: #0d1828; }

    /* Component colour tints */
    .cell.ct-battery  { background: #091a09; border-color: #1a4020; }
    .cell.ct-wire     { background: #091420; border-color: #152d48; }
    .cell.ct-switch   { background: #110920; border-color: #35165a; }
    .cell.ct-light    { background: #1a1400; border-color: #383000; }
    .cell.ct-resistor { background: #180d07; border-color: #381e0e; }

    /* Energized cell border (battery-connected loop) */
    .cell.energized { background: #05180b !important; border-color: #00bb55 !important; }
    /* Lit cell border */
    .cell.lit       { background: #1c1400 !important; border-color: #ffcc00 !important; }

    /* ── Traces ── */
    .trace {
        position: absolute;
        background: #2a5888;
        pointer-events: none;
        border-radius: 1px;
        z-index: 1;
        transition: background .12s, box-shadow .12s;
    }
    /* Horizontal arms */
    .trace-east, .trace-west { height: 32%; width: 52%; top: 34%; }
    .trace-east  { right: 0; }
    .trace-west  { left:  0; }
    /* Vertical arms */
    .trace-north, .trace-south { width: 32%; height: 52%; left: 34%; }
    .trace-north { top:    0; }
    .trace-south { bottom: 0; }

    /* Live = both ends energised */
    .trace.t-live { background: #00ff88; box-shadow: 0 0 5px #00ff88; }
    /* Lit  = both ends are lit bulbs (gold) */
    .trace.t-lit  { background: #ffcc00; box-shadow: 0 0 5px #ffcc00; }

    /* ── Centre node ── */
    .node {
        position: absolute;
        width: 32%; height: 32%;
        border-radius: 50%;
        background: #2a5888;
        z-index: 2;
        pointer-events: none;
        transition: background .12s, box-shadow .12s;
    }
    .node.n-live { background: #00ff88; box-shadow: 0 0 5px #00ff88; }
    .node.n-lit  { background: #ffcc00; box-shadow: 0 0 5px #ffcc00; }

    /* ── Label ── */
    .lbl {
        position: absolute;
        z-index: 3;
        font-size: clamp(0.4rem, 1.3vw, 0.85rem);
        pointer-events: none;
        line-height: 1;
        text-align: center;
        font-family: 'Share Tech Mono', monospace;
    }
    .ct-switch .lbl {
        font-size: clamp(0.35rem, 0.95vw, 0.65rem);
        font-weight: 900;
        color: #ffd700;
    }
    .ct-switch.energized .lbl { color: #00ff88; }
    .ct-battery .lbl { font-size: clamp(0.7rem, 1.8vw, 1.2rem); }
    .ct-light   .lbl { font-size: clamp(0.7rem, 1.8vw, 1.2rem); }

    /* ── Bulb glow ── */
    .glow {
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: radial-gradient(circle, rgba(255,215,0,.28) 0%, transparent 70%);
        pointer-events: none;
        z-index: 0;
        animation: gpulse 1s ease-in-out infinite alternate;
    }
    @keyframes gpulse { from { opacity:.5; } to { opacity:1; } }
</style>

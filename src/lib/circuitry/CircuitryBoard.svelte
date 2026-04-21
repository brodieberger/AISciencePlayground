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
    // A state class is applied only when BOTH ends share that state, so dead-end
    // arms and half-connections always stay dim.

    type TraceInfo = { dir: string; live: boolean; lit: boolean; short: boolean };

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
                    live:  cell.energized && n.energized,
                    lit:   cell.lit       && n.lit,
                    short: cell.shortPath && n.shortPath,
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
            cell.shortPath        ? 'shortpath'         : '',
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
                            class:t-live={trace.live  && !trace.lit && !trace.short}
                            class:t-lit={trace.lit    && !trace.short}
                            class:t-short={trace.short}
                        ></span>
                    {/each}
                    <span
                        class="node"
                        class:n-live={gameState.grid[r][c].energized && !gameState.grid[r][c].lit && !gameState.grid[r][c].shortPath}
                        class:n-lit={gameState.grid[r][c].lit && !gameState.grid[r][c].shortPath}
                        class:n-short={gameState.grid[r][c].shortPath}
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
    /*
     * --cell: the largest square that fits the .game-container (which sets
     *   container-type: size in +page.svelte).  cqw/cqh are the container's
     *   width and height.  40 px budget covers gap + padding on each axis.
     */
    .board {
        --gap: 3px;
        --pad: 8px;
        --cell: min(
            calc((100cqw - 40px) / var(--cols)),
            calc((100cqh - 40px) / var(--rows))
        );

        display: grid;
        grid-template-columns: repeat(var(--cols), var(--cell));
        grid-template-rows:    repeat(var(--rows), var(--cell));
        gap:     var(--gap);
        padding: var(--pad);

        background: #060c16;
        border: 2px solid #162840;
        border-radius: 8px;
        box-shadow:
            0 6px 40px rgba(0, 0, 0, .65),
            inset 0 0 0 1px rgba(30, 65, 110, .25);
    }

    /* ── Cell ── */
    .cell {
        position: relative;
        min-width: 0;
        min-height: 0;
        background: #0a1422;
        border: 1px solid #162438;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        overflow: hidden;
        transition: border-color .12s, background .12s, box-shadow .12s;
    }
    .cell:hover {
        border-color: #2a5080;
        background:   #0d1a2a;
        box-shadow: inset 0 0 0 1px rgba(40, 90, 160, .25);
    }

    /* Component tints */
    .cell.ct-battery  { background: #081a08; border-color: #1a4820; }
    .cell.ct-wire     { background: #080f1f; border-color: #122840; }
    .cell.ct-switch   { background: #100a1e; border-color: #30145a; }
    .cell.ct-light    { background: #1a1200; border-color: #3a2800; }
    .cell.ct-resistor { background: #170c06; border-color: #381806; }

    /* Energized (green) */
    .cell.energized {
        background:  #031408 !important;
        border-color: #00cc55 !important;
        box-shadow: inset 0 0 10px rgba(0, 200, 80, .09) !important;
    }
    /* Lit bulb (gold) */
    .cell.lit {
        background:  #1a1000 !important;
        border-color: #ddaa00 !important;
        box-shadow: inset 0 0 10px rgba(220, 170, 0, .1) !important;
    }
    /* Short-circuit path (red) */
    .cell.shortpath {
        background:  #1e0606 !important;
        border-color: #cc1111 !important;
        box-shadow: inset 0 0 10px rgba(200, 20, 20, .1) !important;
    }

    /* ── Traces ── */
    .trace {
        position: absolute;
        background: #1e3d60;
        pointer-events: none;
        z-index: 1;
        transition: background .12s, box-shadow .12s;
    }

    /* Horizontal arms — slightly rounded outer tip */
    .trace-east, .trace-west {
        height: 36%;
        width:  54%;
        top:    32%;
    }
    .trace-east { right: 0; border-radius: 2px 0 0 2px; }
    .trace-west { left:  0; border-radius: 0 2px 2px 0; }

    /* Vertical arms */
    .trace-north, .trace-south {
        width:  36%;
        height: 54%;
        left:   32%;
    }
    .trace-north { top:    0; border-radius: 0 0 2px 2px; }
    .trace-south { bottom: 0; border-radius: 2px 2px 0 0; }

    /* State colours */
    .trace.t-live  { background: #00ee88; box-shadow: 0 0 7px rgba(0, 238, 136, .7); }
    .trace.t-lit   { background: #ddbb00; box-shadow: 0 0 7px rgba(220, 190, 0, .7); }
    .trace.t-short {
        background: #ff3333;
        box-shadow: 0 0 8px rgba(255, 50, 50, .85);
        animation: shortpulse .55s ease-in-out infinite alternate;
    }

    /* ── Centre node ── */
    .node {
        position: absolute;
        width:  34%;
        height: 34%;
        border-radius: 50%;
        background: #1e3d60;
        z-index: 2;
        pointer-events: none;
        transition: background .12s, box-shadow .12s;
    }
    .node.n-live  { background: #00ee88; box-shadow: 0 0 7px rgba(0, 238, 136, .8); }
    .node.n-lit   { background: #ddbb00; box-shadow: 0 0 7px rgba(220, 190, 0, .8); }
    .node.n-short {
        background: #ff3333;
        box-shadow: 0 0 8px rgba(255, 50, 50, .9);
        animation: shortpulse .55s ease-in-out infinite alternate;
    }

    @keyframes shortpulse {
        from { opacity: .55; box-shadow: 0 0 4px rgba(255, 50, 50, .6); }
        to   { opacity:  1;  box-shadow: 0 0 14px rgba(255, 70, 70, .95); }
    }

    /* ── Label ── */
    .lbl {
        position: absolute;
        z-index: 3;
        font-size: clamp(0.45rem, 1.3vw, 0.9rem);
        pointer-events: none;
        line-height: 1;
        text-align: center;
        font-family: 'Share Tech Mono', monospace;
        user-select: none;
    }
    .ct-switch .lbl {
        font-size: clamp(0.35rem, 0.95vw, 0.68rem);
        font-weight: 900;
        color: #ffd700;
        letter-spacing: -.02em;
    }
    .ct-switch.energized .lbl { color: #00ff88; }
    .ct-battery .lbl { font-size: clamp(0.75rem, 1.9vw, 1.25rem); }
    .ct-light   .lbl { font-size: clamp(0.75rem, 1.9vw, 1.25rem); }

    /* ── Bulb glow ── */
    .glow {
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: radial-gradient(circle, rgba(255, 210, 0, .32) 0%, transparent 65%);
        pointer-events: none;
        z-index: 0;
        animation: gpulse 1s ease-in-out infinite alternate;
    }
    @keyframes gpulse { from { opacity: .5; } to { opacity: 1; } }
</style>

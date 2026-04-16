<!-- $lib/circuitry/CircuitryBoard.svelte -->
<script lang="ts">
    import {
        gameState,
        placeCell,
        eraseCell,
        toggleSwitch,
        type ComponentType,
    } from './game.svelte';

    // Selected tool is passed down from +page.svelte via bind:selected
    let { selected = $bindable<ComponentType>('wire') }: { selected: ComponentType } = $props();

    // ── Click handlers ────────────────────────────────────────────────────────

    function handleClick(r: number, c: number) {
        const cell = gameState.grid[r]?.[c];
        if (!cell) return;

        // Always let switch toggle regardless of selected tool
        if (cell.type === 'switch') {
            toggleSwitch(r, c);
            return;
        }

        if (selected === 'empty') {
            eraseCell(r, c);
        } else {
            placeCell(r, c, selected);
        }
    }

    function handleRightClick(e: MouseEvent, r: number, c: number) {
        e.preventDefault();
        eraseCell(r, c);
    }

    // ── Auto-connect: show a trace arm toward every non-empty neighbour ───────
    // No manual orientation needed — adjacency drives the visual connection.

    function traceDirs(r: number, c: number): string[] {
        const cell = gameState.grid[r]?.[c];
        if (!cell || cell.type === 'empty') return [];
        const dirs: string[] = [];
        const check: [number, number, string][] = [
            [r-1, c,   'north'],
            [r+1, c,   'south'],
            [r,   c-1, 'west'],
            [r,   c+1, 'east'],
        ];
        for (const [nr, nc, dir] of check) {
            const n = gameState.grid[nr]?.[nc];
            if (n && n.type !== 'empty') dirs.push(dir);
        }
        return dirs;
    }

    // ── CSS class builder ─────────────────────────────────────────────────────

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

    // ── Cell label ────────────────────────────────────────────────────────────

    function cellLabel(r: number, c: number): string {
        const cell = gameState.grid[r]?.[c];
        if (!cell) return '';
        switch (cell.type) {
            case 'battery':  return '🔋';
            case 'light':    return cell.lit ? '💡' : '○';
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
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
                class={cellClass(r, c)}
                onclick={() => handleClick(r, c)}
                oncontextmenu={(e) => handleRightClick(e, r, c)}
            >
                {#if gameState.grid[r][c].type !== 'empty'}
                    <!-- Trace arms toward every non-empty neighbour -->
                    {#each traceDirs(r, c) as dir}
                        <span class="trace trace-{dir}"></span>
                    {/each}
                    <!-- Centre dot ties traces together -->
                    <span class="node"></span>
                {/if}

                <!-- Icon / label -->
                {#if cellLabel(r, c)}
                    <span class="lbl">{cellLabel(r, c)}</span>
                {/if}

                <!-- Glow overlay for lit bulb -->
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
        /* Fill parent completely */
        width: 100%;
        height: 100%;
        padding: 6px;
        box-sizing: border-box;
        background: #090e18;
    }

    /* ── Cell ── */
    .cell {
        position: relative;
        /* aspect-ratio keeps cells square as grid scales */
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

    /* ── Energized (battery-connected, green) ── */
    .cell.energized                { background: #05180b !important; border-color: #00bb55 !important; }
    .cell.energized .trace         { background: #00ff88 !important; box-shadow: 0 0 5px #00ff88; }
    .cell.energized .node          { background: #00ff88 !important; box-shadow: 0 0 5px #00ff88; }

    /* ── Lit bulb (gold) ── */
    .cell.lit                      { background: #1c1400 !important; border-color: #ffcc00 !important; }
    .cell.lit .trace               { background: #ffcc00 !important; box-shadow: 0 0 5px #ffcc00; }
    .cell.lit .node                { background: #ffcc00 !important; box-shadow: 0 0 5px #ffcc00; }

    /* ── Traces ── */
    .trace {
        position: absolute;
        background: #2a5888;
        pointer-events: none;
        border-radius: 1px;
        z-index: 1;
        transition: background .12s, box-shadow .12s;
    }
    /* Horizontal */
    .trace-east, .trace-west { height: 32%; width: 52%; top: 34%; }
    .trace-east  { right: 0; }
    .trace-west  { left:  0; }
    /* Vertical */
    .trace-north, .trace-south { width: 32%; height: 52%; left: 34%; }
    .trace-north { top:    0; }
    .trace-south { bottom: 0; }

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
    .ct-battery .lbl  { font-size: clamp(0.7rem, 1.8vw, 1.2rem); }
    .ct-light .lbl    { font-size: clamp(0.7rem, 1.8vw, 1.2rem); }

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

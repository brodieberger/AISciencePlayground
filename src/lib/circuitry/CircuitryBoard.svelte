<!-- $lib/circuitry/CircuitryBoard.svelte -->
<!-- Renders inside the game-container div, styled to match the physics panel -->

<script lang="ts">
    import {
        gameState,
        placeComponent,
        removeComponent,
        toggleSwitch,
        type ComponentType,
        type Direction,
    } from './game.svelte';

    let { selected = 'wire' }: { selected: ComponentType } = $props();

    const ICONS: Record<ComponentType, string> = {
        empty:    '',
        wire:     '',
        battery:  '🔋',
        switch:   '',
        light:    '💡',
        resistor: '',
    };

    const WIRE_CONNECTIONS: Record<string, Direction[]> = {
        'east-west':   ['east', 'west'],
        'north-south': ['north', 'south'],
        'east-south':  ['east', 'south'],
        'east-north':  ['east', 'north'],
        'west-south':  ['west', 'south'],
        'west-north':  ['west', 'north'],
        'cross':       ['east', 'west', 'north', 'south'],
    };

    const ORIENT_GLYPHS: Record<string, string> = {
        'east-west':   '─',
        'north-south': '│',
        'east-south':  '└',
        'east-north':  '┌',
        'west-south':  '┘',
        'west-north':  '┐',
        'cross':       '┼',
    };

    let wireOrientation = $state('east-west');

    function handleClick(row: number, col: number) {
        const cell = gameState.grid[row]?.[col];
        if (!cell) return;

        if (cell.component.type === 'switch') {
            toggleSwitch(row, col);
            return;
        }
        if (cell.component.fixed) return;

        if (selected === 'empty') {
            removeComponent(row, col);
        } else if (selected === 'wire') {
            placeComponent(row, col, 'wire', WIRE_CONNECTIONS[wireOrientation]);
        } else {
            placeComponent(row, col, selected);
        }
    }

    function handleRightClick(e: MouseEvent, row: number, col: number) {
        e.preventDefault();
        removeComponent(row, col);
    }

    function cellClasses(cell: (typeof gameState.grid)[0][0]): string {
        const t = cell.component.type;
        return [
            'cell',
            t !== 'empty'          ? 'has-component' : '',
            cell.component.energized ? 'energized'   : '',
            cell.component.lit       ? 'lit'          : '',
            cell.component.fixed     ? 'fixed'        : '',
            t === 'battery'  ? 'battery'  : '',
            t === 'switch'   ? 'switch'   : '',
            t === 'light'    ? 'light'    : '',
            t === 'resistor' ? 'resistor' : '',
        ].filter(Boolean).join(' ');
    }

    function cellLabel(cell: (typeof gameState.grid)[0][0]): string {
        const t = cell.component.type;
        if (t === 'switch') return cell.component.state.open ? '○' : '━';
        if (t === 'wire')   return '';
        return ICONS[t] ?? '';
    }

    let cols = $derived(gameState.grid[0]?.length ?? 5);
    let rows = $derived(gameState.grid.length ?? 5);
</script>

<div class="circuit-board" style="--cols: {cols}; --rows: {rows};">
    {#each gameState.grid as row}
        {#each row as cell}
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
                class={cellClasses(cell)}
                onclick={() => handleClick(cell.row, cell.col)}
                oncontextmenu={(e) => handleRightClick(e, cell.row, cell.col)}
            >
                {#if cell.component.type !== 'empty'}
                    <span class="icon">{cellLabel(cell)}</span>
                {/if}
                {#each cell.component.connections as dir}
                    <span class="trace trace-{dir}"></span>
                {/each}
            </div>
        {/each}
    {/each}
</div>

{#if selected === 'wire'}
    <div class="orientation-row">
        {#each Object.entries(ORIENT_GLYPHS) as [key, glyph]}
            <button
                class="orient-btn"
                class:active={wireOrientation === key}
                onclick={() => (wireOrientation = key)}
                title={key}
            >{glyph}</button>
        {/each}
    </div>
{/if}

<style>
    .circuit-board {
        display: grid;
        grid-template-columns: repeat(var(--cols), 1fr);
        grid-template-rows: repeat(var(--rows), 1fr);
        gap: 2px;
        width: 100%;
        flex: 1;
        padding: 8px;
        box-sizing: border-box;
    }

    .cell {
        position: relative;
        background: #0d1828;
        border: 1px solid #1a2a3a;
        border-radius: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.1s, border-color 0.1s;
        overflow: hidden;
        min-height: 0;
        aspect-ratio: 1;
    }
    .cell:hover:not(.fixed) {
        background: #152030;
        border-color: #2a4a6a;
    }
    .cell.fixed   { cursor: default; }
    .cell.energized { background: #081828; border-color: #2a6aaa; }
    .cell.lit {
        background: #1e1800;
        border-color: #ccaa00;
        box-shadow: 0 0 10px #ccaa0050 inset;
    }
    .cell.battery  { background: #0d1f0d; border-color: #2a6a2a; }
    .cell.switch   { background: #1a0f20; border-color: #6a3a8a; }

    .icon {
        font-size: clamp(0.65rem, 1.8vw, 1.1rem);
        z-index: 2;
        pointer-events: none;
        line-height: 1;
    }

    .trace {
        position: absolute;
        background: #2a5a8a;
        pointer-events: none;
        border-radius: 1px;
        z-index: 1;
        transition: background 0.15s;
    }
    .energized .trace { background: #3a8aee; }
    .lit .trace        { background: #ddbb00; }

    .trace-east, .trace-west   { height: 25%; width: 50%; top: 37.5%; }
    .trace-north, .trace-south { width: 25%; height: 50%; left: 37.5%; }
    .trace-east  { right: 0; }
    .trace-west  { left: 0; }
    .trace-north { top: 0; }
    .trace-south { bottom: 0; }

    .orientation-row {
        display: flex;
        gap: 4px;
        margin-top: 6px;
        flex-wrap: wrap;
    }
    .orient-btn {
        padding: 4px 10px;
        background: #111c2b;
        border: 1px solid #1e3550;
        border-radius: 4px;
        color: #7aaccc;
        cursor: pointer;
        font-size: 1rem;
        line-height: 1;
        transition: background 0.15s, border-color 0.15s;
    }
    .orient-btn:hover  { background: #1a2d42; border-color: #3a6a99; }
    .orient-btn.active {
        background: #0a2040;
        border-color: #3a8aee;
        color: #e0f0ff;
        box-shadow: 0 0 6px #3a8aee40;
    }
</style>

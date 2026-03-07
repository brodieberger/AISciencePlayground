<!-- $lib/chemistry/ChemistryBoard.svelte -->
<!-- Periodic-style element grid. Click to inspect; double-click or drag to add to reaction. -->

<script lang="ts">
    import {
        gameState,
        levels,
        addToReaction,
        inspectElement,
        type Element,
        type ElementCategory,
        ELEMENTS,
    } from './game.svelte';

    const CATEGORY_COLORS: Record<ElementCategory, string> = {
        alkali:     '#ef9a9a',
        alkaline:   '#ffcc80',
        transition: '#b0bec5',
        nonmetal:   '#80cbc4',
        noble:      '#b2ebf2',
        halogen:    '#dce775',
        metalloid:  '#ce93d8',
        metal:      '#a5d6a7',
    };

    let currentLevel = $derived(levels[gameState.currentLevelIndex]);
    let allowedSymbols = $derived(new Set(currentLevel?.allowedElements ?? []));
    let visibleElements = $derived(ELEMENTS.filter(e => allowedSymbols.has(e.symbol)));

    function handleClick(el: Element) {
        inspectElement(gameState.inspecting?.symbol === el.symbol ? null : el);
    }

    function handleAdd(el: Element) {
        addToReaction(el.symbol);
    }

    function reactivityDots(r: number): string[] {
        return Array(5).fill('').map((_, i) => i < r ? 'filled' : 'empty');
    }

    function isInSlot(symbol: string): boolean {
        return gameState.selectedSlots.some(s => s.element.symbol === symbol);
    }
</script>

<div class="board">
    <!-- Element tiles -->
    <div class="element-grid">
        {#each visibleElements as el}
            {@const inSlot = isInSlot(el.symbol)}
            {@const isInspecting = gameState.inspecting?.symbol === el.symbol}
            <div
                class="element-tile"
                class:in-slot={inSlot}
                class:inspecting={isInspecting}
                style="--cat-color: {CATEGORY_COLORS[el.category]}; --el-color: {el.color};"
                role="button"
                tabindex="0"
                onclick={() => handleClick(el)}
                onkeydown={(e) => e.key === 'Enter' && handleClick(el)}
                title="{el.name} — click to inspect, + to add"
            >
                <span class="atomic-number">{el.atomicNumber}</span>
                <span class="symbol">{el.symbol}</span>
                <span class="el-name">{el.name}</span>
                <span class="atomic-mass">{el.atomicMass.toFixed(1)}</span>

                <!-- Add button -->
                <button
                    class="add-btn"
                    onclick={(e) => { e.stopPropagation(); handleAdd(el); }}
                    title="Add {el.name} to reaction"
                    aria-label="Add {el.name}"
                >+</button>

                <!-- In-slot indicator -->
                {#if inSlot}
                    <span class="slot-badge">
                        {gameState.selectedSlots.find(s => s.element.symbol === el.symbol)?.quantity}
                    </span>
                {/if}
            </div>
        {/each}
    </div>

    <!-- Inspect panel -->
    {#if gameState.inspecting}
        {@const el = gameState.inspecting}
        <div class="inspect-panel" style="--el-color: {el.color}; --cat-color: {CATEGORY_COLORS[el.category]};">
            <button class="close-btn" onclick={() => inspectElement(null)}>✕</button>
            <div class="inspect-header">
                <span class="inspect-symbol">{el.symbol}</span>
                <div class="inspect-meta">
                    <span class="inspect-name">{el.name}</span>
                    <span class="inspect-category">{el.category}</span>
                </div>
            </div>

            <div class="inspect-stats">
                <div class="stat">
                    <span class="stat-label">Atomic #</span>
                    <span class="stat-value">{el.atomicNumber}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Mass</span>
                    <span class="stat-value">{el.atomicMass}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Valence e⁻</span>
                    <span class="stat-value">{el.valence}</span>
                </div>
            </div>

            <div class="stat-row">
                <span class="stat-label">Reactivity</span>
                <div class="reactivity-bar">
                    {#each reactivityDots(el.reactivity) as dot}
                        <span class="dot {dot}"></span>
                    {/each}
                </div>
            </div>

            <p class="inspect-desc">{el.description}</p>

            <button class="inspect-add-btn" onclick={() => { handleAdd(el); inspectElement(null); }}>
                + Add to Reaction
            </button>
        </div>
    {/if}
</div>

<style>
    .board {
        display: flex;
        flex-direction: column;
        gap: 10px;
        height: 100%;
        overflow-y: auto;
        padding: 10px;
        box-sizing: border-box;
    }

    /* ── Element grid ── */
    .element-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-content: flex-start;
    }

    .element-tile {
        position: relative;
        width: 72px;
        height: 80px;
        background: #0d1828;
        border: 1.5px solid color-mix(in srgb, var(--cat-color) 40%, #1a2a3a);
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s ease;
        padding: 4px 2px 2px;
        box-sizing: border-box;
        user-select: none;
    }
    .element-tile:hover {
        background: color-mix(in srgb, var(--cat-color) 12%, #0d1828);
        border-color: color-mix(in srgb, var(--cat-color) 80%, white);
        transform: translateY(-2px);
        box-shadow: 0 4px 16px color-mix(in srgb, var(--cat-color) 30%, transparent);
        z-index: 2;
    }
    .element-tile.in-slot {
        background: color-mix(in srgb, var(--cat-color) 18%, #0d1828);
        border-color: var(--cat-color);
        box-shadow: 0 0 12px color-mix(in srgb, var(--cat-color) 40%, transparent);
    }
    .element-tile.inspecting {
        border-color: white;
        box-shadow: 0 0 0 2px rgba(255,255,255,0.3);
    }

    .atomic-number {
        font-size: 0.55rem;
        color: #5a8aaa;
        align-self: flex-start;
        padding-left: 4px;
        line-height: 1;
    }
    .symbol {
        font-size: 1.4rem;
        font-weight: 700;
        color: var(--cat-color);
        line-height: 1.1;
        letter-spacing: -0.02em;
    }
    .el-name {
        font-size: 0.52rem;
        color: #7a9ab8;
        text-align: center;
        line-height: 1.1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
        padding: 0 2px;
    }
    .atomic-mass {
        font-size: 0.5rem;
        color: #3a5a78;
        line-height: 1;
    }

    /* Add button — appears on hover */
    .add-btn {
        position: absolute;
        bottom: 2px;
        right: 2px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 1px solid var(--cat-color);
        background: #0a1520;
        color: var(--cat-color);
        font-size: 0.75rem;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.15s, background 0.15s;
        padding: 0;
    }
    .element-tile:hover .add-btn {
        opacity: 1;
    }
    .add-btn:hover {
        background: var(--cat-color);
        color: #0a0f1a;
    }

    /* Quantity badge */
    .slot-badge {
        position: absolute;
        top: 2px;
        right: 3px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--cat-color);
        color: #0a0f1a;
        font-size: 0.6rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
    }

    /* ── Inspect panel ── */
    .inspect-panel {
        flex-shrink: 0;
        background: #0d1828;
        border: 1.5px solid color-mix(in srgb, var(--cat-color) 50%, #1a2a3a);
        border-radius: 8px;
        padding: 12px 14px;
        position: relative;
        box-shadow: 0 0 24px color-mix(in srgb, var(--el-color) 20%, transparent);
    }
    .close-btn {
        position: absolute;
        top: 8px; right: 8px;
        background: none;
        border: none;
        color: #3a6a8a;
        cursor: pointer;
        font-size: 0.8rem;
        padding: 2px 5px;
        border-radius: 3px;
        transition: color 0.15s;
    }
    .close-btn:hover { color: #e0e0e0; }

    .inspect-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 10px;
    }
    .inspect-symbol {
        font-size: 2.2rem;
        font-weight: 700;
        color: var(--cat-color);
        line-height: 1;
        min-width: 2.5rem;
        text-align: center;
    }
    .inspect-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .inspect-name {
        font-size: 1rem;
        font-weight: 600;
        color: #e0e0e0;
    }
    .inspect-category {
        font-size: 0.65rem;
        color: var(--cat-color);
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .inspect-stats {
        display: flex;
        gap: 16px;
        margin-bottom: 8px;
    }
    .stat {
        display: flex;
        flex-direction: column;
        gap: 1px;
    }
    .stat-label {
        font-size: 0.58rem;
        color: #3a6a8a;
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }
    .stat-value {
        font-size: 0.9rem;
        font-weight: 600;
        color: #c0d8e8;
    }

    .stat-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
    }
    .reactivity-bar { display: flex; gap: 3px; }
    .dot {
        width: 8px; height: 8px;
        border-radius: 50%;
        border: 1px solid var(--cat-color);
    }
    .dot.filled { background: var(--cat-color); }
    .dot.empty  { background: transparent; }

    .inspect-desc {
        font-size: 0.75rem;
        color: #7a9ab8;
        line-height: 1.5;
        margin: 0 0 10px;
    }

    .inspect-add-btn {
        width: 100%;
        padding: 7px;
        background: color-mix(in srgb, var(--cat-color) 20%, #0a0f1a);
        border: 1.5px solid var(--cat-color);
        border-radius: 5px;
        color: var(--cat-color);
        font-weight: 600;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.15s;
        font-family: inherit;
    }
    .inspect-add-btn:hover {
        background: var(--cat-color);
        color: #0a0f1a;
    }
</style>

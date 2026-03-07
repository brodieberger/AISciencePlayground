<!-- src/routes/circuitry/GameControls.svelte -->

<script lang="ts">
    import {
        levelUp,
        resetGame,
        toggleSandbox,
        gameState,
        levels,
        type ComponentType,
    } from '$lib/circuitry/game.svelte';
    import { uiState } from '$lib/game-ui.svelte';

    let { selected = $bindable<ComponentType>('wire') }: { selected: ComponentType } = $props();

    function handleReset() {
        resetGame();
        uiState.goalReached = false;
        uiState.aiResponse = '';
    }

    // ── Inventory definition ─────────────────────────────────────────────────
    // All possible components the player might ever see, with display metadata.
    // Visibility is filtered by the current level's availableComponents,
    // but battery/light are always shown (read-only reference) so the player
    // knows what they're working with.

    const COMPONENT_META: {
        type: ComponentType;
        label: string;
        icon: string;
        description: string;
        color: string;
    }[] = [
        {
            type: 'battery',
            label: 'Battery',
            icon: '🔋',
            description: 'Power source. Fixed on the board.',
            color: '#2a6a2a',
        },
        {
            type: 'wire',
            label: 'Wire',
            icon: '⬜',
            description: 'Conducts current between components.',
            color: '#2a5a8a',
        },
        {
            type: 'switch',
            label: 'Switch',
            icon: '⚡',
            description: 'Click placed switches to open/close.',
            color: '#6a3a8a',
        },
        {
            type: 'light',
            label: 'Bulb',
            icon: '💡',
            description: 'Lights up when current flows through it.',
            color: '#8a7a20',
        },
        {
            type: 'resistor',
            label: 'Resistor',
            icon: '▬',
            description: 'Limits current. Prevents short circuits.',
            color: '#8a4a20',
        },
        {
            type: 'empty',
            label: 'Eraser',
            icon: '✕',
            description: 'Remove a placed component.',
            color: '#6a2a2a',
        },
    ];

    let currentLevel = $derived(levels[gameState.currentLevelIndex]);

    // All items available to place this level (battery excluded — it's fixed)
    let placeable = $derived(
        new Set(currentLevel?.availableComponents ?? ['wire', 'empty'])
    );

    // Reference-only items (always shown but not selectable for placement)
    let referenceOnly = $derived(
        COMPONENT_META.filter(m => !placeable.has(m.type) && m.type !== 'empty')
    );

    // Selectable inventory items
    let inventory = $derived(
        COMPONENT_META.filter(m => placeable.has(m.type))
    );
</script>

<div class="controls">

    <!-- ── Inventory bank ── -->
    <div class="section">
        <div class="section-label">INVENTORY</div>
        <div class="inventory-grid">
            {#each inventory as item}
                <button
                    class="inv-item"
                    class:active={selected === item.type}
                    style="--accent: {item.color};"
                    onclick={() => (selected = item.type)}
                    title={item.description}
                >
                    <span class="inv-icon">{item.icon}</span>
                    <span class="inv-label">{item.label}</span>
                    {#if selected === item.type}
                        <span class="inv-selected-dot"></span>
                    {/if}
                </button>
            {/each}
        </div>
    </div>

    <!-- ── Reference components (fixed on board, non-placeable) ── -->
    {#if referenceOnly.length > 0}
        <div class="section">
            <div class="section-label">ON BOARD</div>
            <div class="inventory-grid">
                {#each referenceOnly as item}
                    <div
                        class="inv-item ref-item"
                        style="--accent: {item.color};"
                        title={item.description}
                    >
                        <span class="inv-icon">{item.icon}</span>
                        <span class="inv-label">{item.label}</span>
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    <!-- ── Right column: status + actions ── -->
    <div class="right-col">
        <!-- ── Hint / status ── -->
        {#if gameState.hint}
            <div
                class="hint"
                class:hint-success={gameState.solved && !gameState.shortCircuit}
                class:hint-error={gameState.shortCircuit}
            >
                {gameState.hint}
            </div>
        {/if}

        <!-- ── Light progress ── -->
        {#if gameState.totalLights > 0}
            <div class="progress">
                {#each Array(gameState.totalLights) as _, i}
                    <span class="bulb-dot" class:lit={i < gameState.activeLights}>💡</span>
                {/each}
                <span class="progress-label">
                    {gameState.activeLights}/{gameState.totalLights} lit
                </span>
            </div>
        {/if}

        <!-- ── Action buttons ── -->
        <div class="actions">
            <button class="btn btn-reset" onclick={handleReset}>↺ Reset</button>
            <button
                class="btn btn-sandbox"
                class:sandbox-on={gameState.sandboxMode}
                onclick={toggleSandbox}
            >
                {gameState.sandboxMode ? '🔓 Sandbox' : '🔒 Sandbox'}
            </button>
            <button class="btn btn-next" onclick={levelUp}>
                Next →
            </button>
        </div>

        <!-- ── Key ── -->
        <div class="key">
            <span><kbd>Left click</kbd> place</span>
            <span><kbd>Right click</kbd> remove</span>
            <span><kbd>Click switch</kbd> toggle</span>
        </div>
    </div>

</div>

<style>
    .controls {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        gap: 16px;
        padding: 8px 4px 4px;
        overflow-x: auto;
        flex-wrap: nowrap;
    }

    /* ── Section ── */
    .section { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
    .section-label {
        font-size: 0.6rem;
        letter-spacing: 0.15em;
        color: #3a6a8a;
        font-weight: 700;
        white-space: nowrap;
    }

    /* ── Inventory grid ── */
    .inventory-grid {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: 5px;
    }

    .inv-item {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        width: 58px;
        height: 58px;
        background: #0d1828;
        border: 2px solid var(--accent, #2a4a6a);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s ease;
        padding: 4px;
        box-sizing: border-box;
        flex-shrink: 0;
        font-family: inherit;
        color: inherit;
    }
    .inv-item:hover:not(.ref-item) {
        background: #152030;
        border-color: color-mix(in srgb, var(--accent) 80%, white);
        box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 50%, transparent);
        transform: translateY(-1px);
    }
    .inv-item.active {
        background: color-mix(in srgb, var(--accent) 20%, #0a0f1a);
        border-color: color-mix(in srgb, var(--accent) 90%, white);
        box-shadow: 0 0 16px color-mix(in srgb, var(--accent) 60%, transparent);
    }
    .inv-item.ref-item {
        cursor: default;
        opacity: 0.55;
        border-style: dashed;
    }

    .inv-icon {
        font-size: 1.5rem;
        line-height: 1;
    }
    .inv-label {
        font-size: 0.62rem;
        color: #7aaccc;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-align: center;
        line-height: 1.1;
    }
    .inv-item.active .inv-label { color: #e0f0ff; }

    .inv-selected-dot {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: color-mix(in srgb, var(--accent) 90%, white);
        box-shadow: 0 0 6px var(--accent);
    }

    /* ── Right column: hint + progress + actions ── */
    .right-col {
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex-shrink: 0;
        min-width: 160px;
        max-width: 220px;
    }
    .hint {
        padding: 7px 10px;
        background: #0d1828;
        border-left: 3px solid #3a8aee;
        border-radius: 3px;
        font-size: 0.78rem;
        color: #9abccc;
        line-height: 1.4;
    }
    .hint.hint-success { border-color: #44ff44; color: #aaeeaa; background: #0a1f0a; }
    .hint.hint-error   { border-color: #ff6666; color: #eea0a0; background: #1f0a0a; }

    /* ── Progress ── */
    .progress {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.75rem;
        color: #5a8aaa;
    }
    .bulb-dot { font-size: 0.9rem; opacity: 0.25; transition: opacity 0.2s; }
    .bulb-dot.lit { opacity: 1; filter: drop-shadow(0 0 4px #ddbb00); }
    .progress-label { margin-left: 4px; }

    /* ── Actions ── */
    .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 2px;
    }
    .btn {
        padding: 7px 12px;
        border-radius: 4px;
        border: none;
        font-weight: bold;
        cursor: pointer;
        font-size: 0.78rem;
        transition: all 0.2s ease;
        font-family: inherit;
    }
    .btn-reset    { background-color: #ff6666; color: #0b1020; }
    .btn-reset:hover { background-color: #ff4444; box-shadow: 0 0 12px #ff4444; }

    .btn-sandbox  { background-color: #aa66cc; color: #0b1020; }
    .btn-sandbox:hover { background-color: #9944bb; box-shadow: 0 0 12px #9944bb; }
    .btn-sandbox.sandbox-on { background-color: #66ff66; }
    .btn-sandbox.sandbox-on:hover { background-color: #44ff44; box-shadow: 0 0 12px #44ff44; }

    .btn-next     { background-color: #66ccff; color: #0b1020; }
    .btn-next:hover { background-color: #33aaff; box-shadow: 0 0 12px #33aaff; }

    /* ── Key ── */
    .key {
        display: flex;
        flex-direction: column;
        gap: 3px;
        margin-top: 2px;
    }
    .key span { font-size: 0.68rem; color: #3a6a8a; display: flex; align-items: center; gap: 5px; }
    kbd {
        padding: 1px 5px;
        background: #0d1828;
        border: 1px solid #1e3550;
        border-radius: 3px;
        font-size: 0.65rem;
        color: #5a8aaa;
    }
</style>

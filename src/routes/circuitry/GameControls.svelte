<!-- src/routes/circuitry/GameControls.svelte -->
<!-- Mirrors the physics GameControls.svelte style exactly -->

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

    function handleReset() {
        resetGame();
        uiState.goalReached = false;
        uiState.aiResponse = '';
    }

    // Component palette — driven by available components for the current level
    const LABELS: Record<ComponentType, string> = {
        empty:    'Erase',
        wire:     'Wire',
        battery:  'Battery',
        switch:   'Switch',
        light:    'Bulb',
        resistor: 'Resistor',
    };

    let { selected = $bindable('wire') }: { selected: ComponentType } = $props();

    let currentLevel = $derived(levels[gameState.currentLevelIndex]);
    let palette = $derived(currentLevel?.availableComponents ?? ['wire', 'empty']);
</script>

<div class="ui">
    <!-- Component palette -->
    <div class="palette">
        {#each palette as type}
            <button
                class="palette-btn"
                class:active={selected === type}
                onclick={() => (selected = type)}
            >
                {LABELS[type]}
            </button>
        {/each}
    </div>

    <!-- Hint -->
    {#if gameState.hint}
        <div
            class="hint"
            class:hint-success={gameState.solved && !gameState.shortCircuit}
            class:hint-error={gameState.shortCircuit}
        >
            {gameState.hint}
        </div>
    {/if}

    <!-- Action buttons (same style as physics) -->
    <div class="actions">
        <button onclick={handleReset}>Reset</button>
        <button onclick={toggleSandbox} class:sandbox-on={gameState.sandboxMode}>
            {gameState.sandboxMode ? 'Sandbox: ON' : 'Sandbox: OFF'}
        </button>
        <button onclick={levelUp}>
            Next Level: {gameState.currentLevelIndex + 1}
        </button>
    </div>
</div>

<style>
    .ui {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-top: 4px;
    }

    /* ── Palette ── */
    .palette {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
    }
    .palette-btn {
        padding: 6px 12px;
        border-radius: 4px;
        border: 1px solid #2a4a6a;
        background: #111c2b;
        color: #7aaccc;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.8rem;
    }
    .palette-btn:hover {
        background: #1a2d42;
        border-color: #3a8aee;
        color: #e0f0ff;
    }
    .palette-btn.active {
        background: #0a2040;
        border-color: #3a8aee;
        color: #e0f0ff;
        box-shadow: 0 0 10px #3a8aee60;
    }

    /* ── Hint ── */
    .hint {
        padding: 6px 10px;
        background: #0d1828;
        border-left: 3px solid #3a8aee;
        border-radius: 3px;
        font-size: 0.8rem;
        color: #9abccc;
        line-height: 1.4;
    }
    .hint.hint-success {
        border-color: #44ff44;
        color: #aaeeaa;
        background: #0a1f0a;
    }
    .hint.hint-error {
        border-color: #ff6666;
        color: #eea0a0;
        background: #1f0a0a;
    }

    /* ── Action buttons — same style as physics GameControls ── */
    .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0;
    }
    button {
        padding: 8px 12px;
        margin-top: 10px;
        margin-right: 5px;
        border-radius: 4px;
        border: none;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .actions button:nth-child(1) {
        background-color: #ff6666;
        color: #0b1020;
    }
    .actions button:nth-child(1):hover {
        background-color: #ff4444;
        box-shadow: 0 0 12px #ff4444;
    }
    .actions button:nth-child(2) {
        background-color: #aa66cc;
        color: #0b1020;
    }
    .actions button:nth-child(2):hover {
        background-color: #9944bb;
        box-shadow: 0 0 12px #9944bb;
    }
    .actions button:nth-child(2).sandbox-on {
        background-color: #66ff66;
        color: #0b1020;
    }
    .actions button:nth-child(2).sandbox-on:hover {
        background-color: #44ff44;
        box-shadow: 0 0 12px #44ff44;
    }
    .actions button:nth-child(3) {
        background-color: #66ccff;
        color: #0b1020;
    }
    .actions button:nth-child(3):hover {
        background-color: #33aaff;
        box-shadow: 0 0 12px #33aaff;
    }
</style>

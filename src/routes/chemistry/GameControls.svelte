<!-- src/routes/chemistry/GameControls.svelte -->

<script lang="ts">
    import {
        levelUp,
        resetGame,
        gameState,
        levels,
    } from '$lib/chemistry/game.svelte';
    import { uiState } from '$lib/game-ui.svelte';

    function handleReset() {
        resetGame();
        uiState.goalReached = false;
        uiState.aiResponse = '';
    }

    let currentLevel = $derived(levels[gameState.currentLevelIndex]);
</script>

<div class="controls-bar">

    <!-- Level info -->
    <div class="level-info">
        <span class="level-name">{currentLevel?.name ?? ''}</span>
        {#if currentLevel?.targetFormula}
            <span class="level-goal">Goal: <strong>{currentLevel.targetFormula}</strong></span>
        {:else if currentLevel?.sandboxMode}
            <span class="level-goal sandbox">Sandbox mode — no goal</span>
        {/if}
    </div>

    <!-- Goal reached flash -->
    {#if gameState.goalReached}
        <div class="goal-flash">🎉 Goal reached!</div>
    {/if}

    <!-- Actions -->
    <div class="actions">
        <button class="btn btn-reset" onclick={handleReset}>↺ Reset</button>
        <button class="btn btn-next" onclick={levelUp}>
            Next Level →
        </button>
    </div>

    <!-- Key -->
    <div class="key">
        <span><kbd>Click tile</kbd> inspect</span>
        <span><kbd>+ button</kbd> add to reaction</span>
        <span><kbd>⚗ React</kbd> combine</span>
    </div>
</div>

<style>
    .controls-bar {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 16px;
        padding: 8px 4px 2px;
        flex-wrap: wrap;
    }

    .level-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex-shrink: 0;
    }
    .level-name {
        font-size: 0.75rem;
        font-weight: 700;
        color: #8aaabb;
        letter-spacing: 0.04em;
    }
    .level-goal {
        font-size: 0.68rem;
        color: #5a8aaa;
    }
    .level-goal strong { color: #80cbc4; }
    .level-goal.sandbox { color: #7a6a9a; }

    .goal-flash {
        padding: 4px 12px;
        background: #0a2a0a;
        border: 1px solid #4caf50;
        border-radius: 12px;
        color: #4caf50;
        font-size: 0.8rem;
        font-weight: 700;
        animation: flash-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        flex-shrink: 0;
    }
    @keyframes flash-in {
        from { transform: scale(0.5); opacity: 0; }
        to   { transform: scale(1); opacity: 1; }
    }

    .actions {
        display: flex;
        gap: 5px;
        flex-shrink: 0;
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
    .btn-reset { background-color: #ff6666; color: #0b1020; }
    .btn-reset:hover { background-color: #ff4444; box-shadow: 0 0 12px #ff4444; }
    .btn-next  { background-color: #66ccff; color: #0b1020; }
    .btn-next:hover  { background-color: #33aaff; box-shadow: 0 0 12px #33aaff; }

    .key {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        flex-shrink: 0;
    }
    .key span { font-size: 0.65rem; color: #3a6a8a; display: flex; align-items: center; gap: 4px; }
    kbd {
        padding: 1px 5px;
        background: #0d1828;
        border: 1px solid #1e3550;
        border-radius: 3px;
        font-size: 0.62rem;
        color: #5a8aaa;
        white-space: nowrap;
    }
</style>

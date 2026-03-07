<!-- src/routes/circuitry/+page.svelte -->

<script lang="ts">
    import { startGame } from '$lib/circuitry/game.svelte';
    import { uiState } from '$lib/game-ui.svelte';
    import GameShell from '$lib/components/GameShell.svelte';
    import AIPanel from '$lib/components/AIPanel.svelte';
    import GameControls from './GameControls.svelte';
    import GoalBanner from '$lib/components/GoalBanner.svelte';
    import CircuitryBoard from '$lib/circuitry/CircuitryBoard.svelte';
    import type { ComponentType } from '$lib/circuitry/game.svelte';

    let gameContainer: HTMLDivElement;
    let selected: ComponentType = $state('wire');

    $effect(() => {
        if (!gameContainer) return;
        startGame(gameContainer, {
            onGoal: () => (uiState.goalReached = true),
        });
    });
</script>

<GameShell>
    {#snippet ai()}
        <h2>Lab Assistant</h2>
        <AIPanel />
    {/snippet}

    {#snippet experiment()}
        <GoalBanner />
        <div class="game-container" bind:this={gameContainer}>
            <CircuitryBoard {selected} />
        </div>
        <div class="controls-bar">
            <GameControls bind:selected />
        </div>
    {/snippet}
</GameShell>

<style>
    /* Board: grows to fill remaining space, but never overflows */
    .game-container {
        flex: 1 1 0;
        min-height: 0;
        width: 100%;
        background-color: #0a0f1a;
        border: 2px solid #333;
        border-radius: 6px;
        box-shadow: 0 0 16px #000 inset;
        position: relative;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    /* Controls: never shrink, always fully visible */
    .controls-bar {
        flex-shrink: 0;
        width: 100%;
        overflow-x: auto;
    }
</style>

<!-- src/routes/circuitry/+page.svelte -->
<!-- Mirrors src/routes/(physics)/+page.svelte structure exactly -->

<script lang="ts">
    import { startGame, gameState } from '$lib/circuitry/game.svelte';
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
        <GameControls bind:selected />
    {/snippet}
</GameShell>

<style>
    .game-container {
        flex: 1;
        width: 100%;
        background-color: #0a0f1a;
        border: 2px solid #333;
        border-radius: 6px;
        box-shadow: 0 0 16px #000 inset;
        position: relative;
        display: flex;
        flex-direction: column;
    }
</style>

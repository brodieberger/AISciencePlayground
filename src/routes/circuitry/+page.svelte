<!-- src/routes/circuitry/+page.svelte -->
<script lang="ts">
    import { startGame, askAI, gameState } from '$lib/circuitry/game.svelte';
    import { uiState } from '$lib/game-ui.svelte';

    import GameShell      from '$lib/components/GameShell.svelte';
    import AIPanel        from '$lib/components/AIPanel.svelte';
    import GoalBanner     from '$lib/components/GoalBanner.svelte';
    import GameControls   from './GameControls.svelte';
    import CircuitryBoard from '$lib/circuitry/CircuitryBoard.svelte';
    import type { ComponentType } from '$lib/circuitry/game.svelte';

    let selected: ComponentType = $state('wire');

    // Initialise game (sets gameType context, loads first level)
    $effect(() => {
        startGame(document.body, {
            onGoal: () => { uiState.goalReached = true; },
        });
    });
</script>

<GameShell>
    <!-- ── LEFT: AI panel ── -->
    {#snippet ai()}
        <h2>Lab Assistant</h2>
        <AIPanel />
    {/snippet}

    <!-- ── RIGHT: game ── -->
    {#snippet experiment()}
        <!-- Goal banner sits above the board, absolutely positioned -->
        <GoalBanner />

        <!-- Board: grows to fill space between header and controls -->
        <div class="game-container">
            <CircuitryBoard bind:selected />
        </div>

        <!-- Controls bar fixed at bottom of experiment panel -->
        <div class="controls-bar">
            <GameControls bind:selected />
        </div>
    {/snippet}
</GameShell>

<style>
    /*
     * GameShell's .experiment-panel uses:
     *   display:flex; flex-direction:column; padding:15px;
     * We need padding:0 so board goes edge-to-edge and
     * controls bar sticks to the bottom cleanly.
     */
    :global(.experiment-panel) {
        padding: 0 !important;
        overflow: hidden !important;
    }

    /* Board fills all remaining vertical space */
    .game-container {
        flex: 1 1 0;
        min-height: 0;
        width: 100%;
        background: #090e18;
        position: relative;   /* GoalBanner uses position:absolute */
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    /* Controls bar never shrinks — always visible */
    .controls-bar {
        flex-shrink: 0;
        width: 100%;
        overflow-x: auto;
    }
</style>

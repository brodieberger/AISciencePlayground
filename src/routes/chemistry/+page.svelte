<!-- src/routes/chemistry/+page.svelte -->

<script lang="ts">
    import { startGame, levelUp, gameState, levels } from '$lib/chemistry/game.svelte';
    import { uiState } from '$lib/game-ui.svelte';
    import GameShell from '$lib/components/GameShell.svelte';
    import AIPanel from '$lib/components/AIPanel.svelte';
    import GameControls from './GameControls.svelte';
    import GoalBanner from '$lib/components/GoalBanner.svelte';
    import ChemistryBoard from '$lib/chemistry/ChemistryBoard.svelte';
    import ReactionPanel from '$lib/chemistry/ReactionPanel.svelte';

    let gameContainer: HTMLDivElement;

    $effect(() => {
        if (!gameContainer) return;
        startGame(gameContainer, {
            onGoal: () => (uiState.goalReached = true),
        });
    });

    let currentLevel = $derived(levels[gameState.currentLevelIndex]);
    let hasNextLevel = $derived(gameState.currentLevelIndex < levels.length - 1);
</script>

<GameShell>
    {#snippet ai()}
        <h2>Lab Assistant</h2>
        <AIPanel />
    {/snippet}

    {#snippet experiment()}
        <GoalBanner
            levelName={currentLevel?.name}
            goalDescription={currentLevel?.targetFormula ? `Create ${currentLevel.targetFormula}` : undefined}
            {hasNextLevel}
            onNextLevel={levelUp}
        />

        <!-- Main game area: element board + reaction panel side by side -->
        <div class="game-container" bind:this={gameContainer}>
            <div class="board-pane">
                <div class="pane-label">ELEMENTS</div>
                <ChemistryBoard />
            </div>
            <div class="divider"></div>
            <div class="reaction-pane">
                <div class="pane-label">REACTION</div>
                <ReactionPanel />
            </div>
        </div>

        <div class="controls-bar">
            <GameControls />
        </div>
    {/snippet}
</GameShell>

<style>
    /* ── Main container: two panes side by side ── */
    .game-container {
        flex: 1 1 0;
        min-height: 0;
        width: 100%;
        background-color: #0a0f1a;
        border: 2px solid #333;
        border-radius: 6px;
        box-shadow: 0 0 16px #000 inset;
        display: flex;
        flex-direction: row;
        overflow: hidden;
    }

    /* Element grid pane — larger */
    .board-pane {
        flex: 3;
        min-width: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding: 8px 6px 8px 10px;
    }

    /* Reaction panel — narrower */
    .reaction-pane {
        flex: 2;
        min-width: 220px;
        max-width: 320px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding: 8px 10px 8px 6px;
        background: #080e1a;
    }

    .divider {
        width: 1px;
        background: #1a2a3a;
        flex-shrink: 0;
    }

    .pane-label {
        font-size: 0.58rem;
        letter-spacing: 0.18em;
        color: #2a5a7a;
        font-weight: 700;
        padding-bottom: 6px;
        flex-shrink: 0;
    }

    /* Controls bar — always visible at bottom */
    .controls-bar {
        flex-shrink: 0;
        width: 100%;
    }
</style>

<script lang="ts">
	import { startGame, levelUp } from '$lib/physics/game.svelte';
	import { uiState, physicsGameState } from '$lib/game-ui.svelte';
	import { levels } from '$lib/physics/level-data';
	import GameShell from '$lib/components/GameShell.svelte';
	import AIPanel from '$lib/components/AIPanel.svelte';
	import GameControls from '../GameControls.svelte';
	import GoalBanner from '$lib/components/GoalBanner.svelte';

	let gameContainer: HTMLDivElement;

	$effect(() => {
		if (!gameContainer) return;
		startGame(gameContainer, {
			onGoal: () => (uiState.goalReached = true)
		});
	});

	let hasNextLevel = $derived(physicsGameState.currentLevelIndex < levels.length - 1);
</script>

<GameShell>
	{#snippet ai()}
		<h2>Lab Assistant</h2>
		<AIPanel />
	{/snippet}

	{#snippet experiment()}
		<GoalBanner
			levelName={`Level ${physicsGameState.currentLevelIndex + 1}`}
			goalDescription="Get the ball to the goal!"
			{hasNextLevel}
			onNextLevel={levelUp}
		/>
		<div class="game-container" bind:this={gameContainer}></div>
		<GameControls />
	{/snippet}
</GameShell>

<style>
.game-container {
	flex: 1;
	min-height: 0;
	width: 100%;
	background-color: #0a0f1a;
	border: 2px solid #333;
	border-radius: 6px;
	box-shadow: 0 0 16px #000 inset;
	position: relative;
	overflow: hidden;
}
</style>

<script lang="ts">
	import { startGame } from '$lib/physics/game.svelte';
	import { uiState } from '$lib/game-ui.svelte';
	import GameLayout from '$lib/components/GameLayout.svelte';
	import GameControls from '$lib/components/GameControls.svelte';
	import AIPanel from '$lib/components/AIPanel.svelte';
	import GoalBanner from '$lib/components/GoalBanner.svelte';

	let gameContainer: HTMLDivElement;

	$effect(() => {
		startGame(gameContainer, {
			onGoal: () => {
				uiState.goalReached = true;
			}
		});
	});
</script>

<GameLayout>
	{#snippet title()}
		Physics Sandbox
	{/snippet}

	{#snippet controls()}
		<GameControls />
	{/snippet}

	{#snippet ai()}
		<AIPanel />
	{/snippet}

	{#snippet status()}
		<GoalBanner />
	{/snippet}

	<div class="game-container" bind:this={gameContainer}></div>
</GameLayout>


<style>
	.game-container {
		position: relative;
		width: 800px;
		height: 600px;
		border: 1px solid #444;
		background: #0b1020;
	}
</style>
<script lang="ts">
	import { startSandbox } from '$lib/physics/game.svelte';
	import { uiState } from '$lib/game-ui.svelte';
	import GameShell from '$lib/components/GameShell.svelte';
	import AIPanel from '$lib/components/AIPanel.svelte';
	import GoalBanner from '$lib/components/GoalBanner.svelte';
	import SandboxControls from './SandboxControls.svelte';

	let gameContainer: HTMLDivElement;

	$effect(() => {
		if (!gameContainer) return;
		startSandbox(gameContainer, {
			onGoal: () => (uiState.goalReached = true)
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
		<div class="game-container" bind:this={gameContainer}></div>
		<SandboxControls />
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

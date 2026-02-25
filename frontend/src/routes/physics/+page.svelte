<script lang="ts">
	import { onMount } from 'svelte';
	import ResetButton from '$lib/components/ResetButton.svelte';
	import { startGame, resetGame, askAI, releaseCage } from '$lib/physics/game';
	import {  } from '$lib/physics/level-creation';

	let gameContainer: HTMLDivElement;

	let aiPrompt = '';
	let aiResponse = '';
	let goalReached = false;

	onMount(() => {
		startGame(gameContainer, {
			onGoal: () => {
				goalReached = true;
			}
		});
	});

	function handleReset() {
		resetGame();
		goalReached = false;
		aiResponse = '';
	}

	async function handleAskAI() {
		if (!aiPrompt.trim()) return;

		aiResponse = await askAI(aiPrompt);
		aiPrompt = '';
	}
</script>

<h2>Physics Sandbox</h2>

<div class="ui">
	<ResetButton onclick={handleReset} />
	<button on:click={releaseCage}>Release Cage</button>
</div>

<div class="ai-panel">
	<input type="text" placeholder="Ask the AI for help..." bind:value={aiPrompt} />
	<button on:click={handleAskAI}>Ask AI</button>
	<p class="ai-output">{aiResponse}</p>
</div>

{#if goalReached}
	<p class="game-over">Goal reached!</p>
{/if}

<div class="game-container" bind:this={gameContainer}></div>

<style>
	.game-container {
		position: relative;
		width: 800px;
		height: 600px;
		margin-top: 12px;
		border: 1px solid #444;
		background: #0b1020;
	}

	.ui {
		display: flex;
		gap: 8px;
		margin-bottom: 8px;
	}

	.ai-panel {
		margin: 8px 0;
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.ai-output {
		color: #66ccff;
	}

	.game-over {
		color: #00ff88;
		font-weight: bold;
		margin-bottom: 6px;
	}
</style>

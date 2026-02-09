<script>
	import { onMount, onDestroy } from "svelte";
	import { startGame } from "$lib/physics/game";

	let gameContainer;

	// UI elements passed into the physics engine
	let resetBtn;
	let releaseBtn;
	let askAiBtn;
	let aiInput;
	let aiOutput;
	let gameOverMessage;

	onMount(() => {
		startGame(gameContainer, {
			resetBtn,
			releaseBtn,
			askAiBtn,
			aiInput,
			aiOutput,
			gameOverMessage
		});
	});
</script>

<h2>Physics Sandbox</h2>

<div class="ui">
	<button bind:this={resetBtn}>Reset</button>
	<button bind:this={releaseBtn}>Release Cage</button>
</div>

<div class="ai-panel">
	<input
		bind:this={aiInput}
		type="text"
		placeholder="Ask the AI for help..."
	/>
	<button bind:this={askAiBtn}>Ask AI</button>
	<p bind:this={aiOutput} class="ai-output"></p>
</div>

<p bind:this={gameOverMessage} class="game-over">
	Goal reached!
</p>

<div
	class="game-container"
	bind:this={gameContainer}
></div>

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
		display: none;
		color: #00ff88;
		font-weight: bold;
		margin-bottom: 6px;
	}
</style>

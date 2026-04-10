<script lang="ts">
	import { levelUp, releaseCage, resetGame } from '$lib/physics/game.svelte';
	import { uiState, physicsGameState } from '$lib/game-ui.svelte';

	function handleReset() {
		resetGame();
		uiState.goalReached = false;
		uiState.aiResponse = '';
	}
</script>

<div class="ui">
	<button onclick={handleReset}>Reset</button>
	<button onclick={releaseCage}>Release Cage</button>
	<button onclick={levelUp}>
		Next Level: {physicsGameState.currentLevelIndex + 1}
	</button>
</div>

<style>
button {
	padding: 8px 12px;
	margin-top: 10px;
	margin-right: 5px;
	border-radius: 4px;
	border: none;
	font-weight: bold;
	cursor: pointer;
	transition: all 0.2s ease;
}

button:nth-child(1) {
	background-color: #ff6666;
	color: #0b1020;
}

button:nth-child(1):hover {
	background-color: #ff4444;
	box-shadow: 0 0 12px #ff4444;
}

button:nth-child(2) {
	background-color: #66ff66;
	color: #0b1020;
}

button:nth-child(2):hover {
	background-color: #44ff44;
	box-shadow: 0 0 12px #44ff44;
}

button:nth-child(3) {
	background-color: #66ccff;
	color: #0b1020;
}

button:nth-child(3):hover {
	background-color: #33aaff;
	box-shadow: 0 0 12px #33aaff;
}
</style>
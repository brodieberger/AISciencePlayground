<script lang="ts">
	import { levelUp, releaseCage, resetGame, gameState } from '$lib/physics/game.svelte';
	import { uiState } from '$lib/game-ui.svelte';

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
		Next Level: {gameState.currentLevelIndex + 1}
	</button>
</div>
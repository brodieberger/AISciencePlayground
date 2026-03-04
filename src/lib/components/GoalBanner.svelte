<script lang="ts">
	import { uiState } from '$lib/game-ui.svelte';
</script>

{#if uiState.goalReached}
	<div class="game-over">
		You win!
		<button onclick={() => (uiState.goalReached = false)}>
			Close
		</button>
	</div>
{/if}

<style>
.game-over {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	background-color: rgba(0,0,0,0.8);
	color: white;
	padding: 20px;
	border-radius: 8px;
	font-size: 24px;
	z-index: 20;
}
</style>
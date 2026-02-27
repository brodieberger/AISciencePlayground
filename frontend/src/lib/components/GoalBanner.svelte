<script lang="ts">
	import { uiState } from '$lib/game-ui.svelte';
</script>

{#if uiState.goalReached}
	<p class="game-over">Goal reached!</p>
{/if}
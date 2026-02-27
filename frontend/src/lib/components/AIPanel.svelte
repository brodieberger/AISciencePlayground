<script lang="ts">
	import { askAI } from '$lib/physics/game.svelte';
	import { uiState } from '$lib/game-ui.svelte';

	async function handleAskAI() {
		if (!uiState.aiPrompt.trim()) return;

		uiState.aiResponse = await askAI(uiState.aiPrompt);
		uiState.aiPrompt = '';
	}
</script>

<div class="ai-panel">
	<input
		type="text"
		placeholder="Ask the AI for help..."
		bind:value={uiState.aiPrompt}
	/>
	<button onclick={handleAskAI}>Ask AI</button>
	<p class="ai-output">{uiState.aiResponse}</p>
</div>
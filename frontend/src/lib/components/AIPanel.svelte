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

<style>
input {
	width: 100%;
	padding: 8px;
	margin: 10px 0 8px 0;
	border-radius: 4px;
	border: 1px solid #444;
	background-color: #22293c;
	color: #fff;
}

input:focus {
	outline: none;
	border-color: #66ccff;
	box-shadow: 0 0 8px #66ccff;
}

button {
	width: 100%;
	padding: 8px;
	margin-bottom: 10px;
	border: none;
	border-radius: 4px;
	background-color: #66ccff;
	color: #0b1020;
	font-weight: bold;
	cursor: pointer;
	transition: all 0.2s ease;
}

button:hover {
	background-color: #33aaff;
	box-shadow: 0 0 12px #33aaff;
}

.ai-output {
	width: 100%;
	background-color: #111520;
	border: 1px solid #333;
	border-radius: 6px;
	padding: 10px;
	min-height: 60px;
	box-shadow: inset 0 0 8px #000;
	overflow-wrap: break-word;
}
</style>
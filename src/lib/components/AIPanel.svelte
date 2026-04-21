<script lang="ts">
	import { askAI } from '$lib/game-ui.svelte';
	import { uiState } from '$lib/game-ui.svelte';
	import {buildPhysicsContext} from '$lib/physics/game.svelte';
	import {buildChemistryContext} from '$lib/chemistry/game.svelte';
	import {buildCircuitryContext} from '$lib/circuitry/game.svelte';
	import Lumi from './Lumi.svelte';

	async function handleAskAI() {
		const context = getContextForGame();

		console.log("Context:", context);

		const reply = await askAI(uiState.gameType, uiState.aiPrompt, context);

		console.log("Final reply:", reply);

		uiState.aiResponse = reply;
		uiState.aiPrompt = '';
	}

	function getContextForGame() {
    switch (uiState.gameType) {
        case "physics":
            return buildPhysicsContext();
        case "circuitry":
            return buildCircuitryContext();
        case "chemistry":
            return buildChemistryContext();
        default:
            return {};
    }
}

</script>

<div class="ai-panel">
	<Lumi />

	<input
		type="text"
		placeholder="Ask Lumi for help..."
		bind:value={uiState.aiPrompt}
	/>
	<button onclick={handleAskAI}>Ask Lumi ✨</button>
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
	border-color: #FFD54F;
	box-shadow: 0 0 8px #FFD54F80;
}

button {
	width: 100%;
	padding: 8px;
	margin-bottom: 10px;
	border: none;
	border-radius: 4px;
	background: linear-gradient(135deg, #FFD54F, #FFC107);
	color: #3E2723;
	font-weight: bold;
	cursor: pointer;
	transition: all 0.2s ease;
	font-size: 0.9rem;
}

button:hover {
	background: linear-gradient(135deg, #FFEE58, #FFD54F);
	box-shadow: 0 0 16px #FFD54F60;
	transform: translateY(-1px);
}

button:active {
	transform: translateY(0);
}
</style>
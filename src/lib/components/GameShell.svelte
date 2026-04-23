<script lang="ts">
	import { goto } from '$app/navigation';
	import { uiState } from '$lib/game-ui.svelte';

	type Props = {
		ai?: () => any;
		experiment?: () => any;
	};

	let { ai, experiment }: Props = $props();

	function goHome() {
		uiState.aiResponse = '';
		uiState.aiPrompt = '';
		uiState.goalReached = false;
		goto('/');
	}
</script>

<div class="container">
	<div class="ai-panel">
		<button class="back-btn" onclick={goHome} title="Back to Main Menu">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
				stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="15 18 9 12 15 6"></polyline>
			</svg>
			Main Menu
		</button>
		{@render ai?.()}
	</div>

	<div class="experiment-panel">
		{@render experiment?.()}
	</div>
</div>

<style>
:global(html, body) {
	margin: 0;
	padding: 0;
	height: 100%;
	font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
	background-color: #0b1020;
	color: #e0e0e0;
}

.container {
	display: flex;
	height: 100vh;
	width: 100vw;
	overflow: hidden;
}

.ai-panel {
	width: 25%;
	background-color: #1b1f2b;
	border-right: 2px solid #333;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 20px;
	box-sizing: border-box;
}

.experiment-panel {
	flex: 1;
	position: relative;
	background-color: #101420;
	display: flex;
	flex-direction: column;
	align-items: stretch;  
	padding: 15px;
	box-sizing: border-box;
}

/* ── Back button ── */
.back-btn {
	align-self: flex-start;
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 6px 12px;
	margin-bottom: 8px;
	border: 1px solid #2a3a55;
	border-radius: 8px;
	background: rgba(255, 255, 255, 0.03);
	color: #5a7a8a;
	font-family: 'JetBrains Mono', 'Segoe UI', monospace;
	font-size: 0.68rem;
	font-weight: 600;
	letter-spacing: 0.06em;
	cursor: pointer;
	transition: all 0.2s ease;
}

.back-btn:hover {
	color: #ffd54f;
	border-color: #ffd54f;
	background: rgba(255, 213, 79, 0.06);
	transform: translateX(-2px);
}

.back-btn:active {
	transform: translateX(0);
}

</style>
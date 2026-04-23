<script lang="ts">
	import { uiState, physicsGameState } from '$lib/game-ui.svelte';
	import { levelUp } from '$lib/physics/game.svelte';
	import { levels } from '$lib/physics/level-data';

	function close() {
		uiState.goalReached = false;
	}

	function nextLevel() {
		uiState.goalReached = false;
		uiState.aiResponse = '';
		levelUp();
	}

	const hasNextLevel = $derived(
		physicsGameState.mode === 'levels' &&
		physicsGameState.currentLevelIndex < levels.length - 1
	);
</script>

{#if uiState.goalReached}
	<div class="banner">
		<div class="content">
			<span class="trophy">🏆</span>
			<p class="title">You Win!</p>
			<div class="actions">
				{#if hasNextLevel}
					<button class="btn-next" onclick={nextLevel}>Next Level →</button>
				{/if}
				<button class="btn-close" onclick={close}>Close</button>
			</div>
		</div>
	</div>
{/if}

<style>
.banner {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(0, 0, 0, 0.65);
	z-index: 20;
	animation: fade-in 0.2s ease;
}

.content {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
	background: linear-gradient(135deg, #0d1828, #111e30);
	border: 1.5px solid #2a4a6a;
	border-radius: 16px;
	padding: 36px 48px;
	box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px #1a3a5a;
}

.trophy {
	font-size: 3rem;
	filter: drop-shadow(0 0 12px #ffdd44);
	animation: bounce 0.6s ease;
}

.title {
	font-family: 'Fredoka One', cursive;
	font-size: 2rem;
	margin: 0;
	background: linear-gradient(135deg, #ffd54f, #ffab40);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
	background-clip: text;
}

.actions {
	display: flex;
	gap: 10px;
	margin-top: 4px;
}

button {
	padding: 10px 22px;
	border: none;
	border-radius: 8px;
	font-weight: bold;
	font-size: 0.9rem;
	cursor: pointer;
	transition: all 0.2s ease;
	font-family: inherit;
}

.btn-next {
	background: linear-gradient(135deg, #66ff99, #44cc77);
	color: #0b1020;
}
.btn-next:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 16px #44cc7766;
}

.btn-close {
	background: #1a2540;
	color: #88aacc;
	border: 1.5px solid #2a3a55;
}
.btn-close:hover {
	background: #1e2f50;
	color: #aaccee;
}

@keyframes fade-in {
	from { opacity: 0; }
	to   { opacity: 1; }
}

@keyframes bounce {
	0%, 100% { transform: translateY(0); }
	40%       { transform: translateY(-12px); }
	70%       { transform: translateY(-4px); }
}
</style>

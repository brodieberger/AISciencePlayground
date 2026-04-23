<script lang="ts">
	import { goto } from '$app/navigation';
	import { uiState } from '$lib/game-ui.svelte';

	type Props = {
		levelName?:       string;
		goalDescription?: string;
		hasNextLevel?:    boolean;
		onNextLevel?:     () => void;
	};

	let { levelName, goalDescription, hasNextLevel = false, onNextLevel }: Props = $props();

	function close() {
		uiState.goalReached = false;
	}

	function handleNext() {
		uiState.goalReached = false;
		uiState.aiResponse  = '';
		onNextLevel?.();
	}

	function handleHome() {
		uiState.goalReached = false;
		uiState.aiResponse  = '';
		uiState.aiPrompt    = '';
		goto('/');
	}
</script>

{#if uiState.goalReached}
	<div class="banner">
		<div class="content">
			<span class="trophy">🏆</span>

			{#if levelName}
				<p class="level-name">{levelName}</p>
			{/if}

			<p class="title">You Win!</p>

			{#if goalDescription}
				<p class="goal-text">✓ {goalDescription}</p>
			{/if}

			<div class="actions">
				{#if hasNextLevel}
					<button class="btn-next" onclick={handleNext}>Next Level →</button>
				{/if}
				<button class="btn-close" onclick={close}>Keep Playing</button>
				<button class="btn-home"  onclick={handleHome}>Main Menu</button>
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
	gap: 10px;
	background: linear-gradient(135deg, #0d1828, #111e30);
	border: 1.5px solid #2a4a6a;
	border-radius: 16px;
	padding: 36px 48px;
	box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px #1a3a5a;
	max-width: 380px;
	text-align: center;
}

.trophy {
	font-size: 3rem;
	filter: drop-shadow(0 0 12px #ffdd44);
	animation: bounce 0.6s ease;
}

.level-name {
	margin: 0;
	font-size: 0.7rem;
	letter-spacing: 0.15em;
	text-transform: uppercase;
	color: #5a8aaa;
	font-weight: 600;
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

.goal-text {
	margin: 0;
	font-size: 0.78rem;
	color: #88ccaa;
	line-height: 1.4;
}

.actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 8px;
	margin-top: 6px;
}

button {
	padding: 10px 20px;
	border: none;
	border-radius: 8px;
	font-weight: bold;
	font-size: 0.88rem;
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

.btn-home {
	background: transparent;
	color: #556070;
	border: 1.5px solid #2a3040;
	font-size: 0.78rem;
	padding: 8px 16px;
}
.btn-home:hover {
	color: #ffd54f;
	border-color: #ffd54f44;
	background: rgba(255, 213, 79, 0.05);
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

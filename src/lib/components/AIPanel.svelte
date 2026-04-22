<script lang="ts">
	import { askAI } from '$lib/game-ui.svelte';
	import { uiState } from '$lib/game-ui.svelte';
	import {buildPhysicsContext} from '$lib/physics/game.svelte';
	import {buildChemistryContext} from '$lib/chemistry/game.svelte';
	import {buildCircuitryContext} from '$lib/circuitry/game.svelte';

	let isThinking = $state(false);

	async function handleAskAI() {
		if (!uiState.aiPrompt.trim() || isThinking) return;

		const context = getContextForGame();
		isThinking = true;
		uiState.aiResponse = '';

		const reply = await askAI(uiState.gameType, uiState.aiPrompt, context);

		isThinking = false;
		uiState.aiResponse = reply;
		uiState.aiPrompt = '';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleAskAI();
		}
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
	<!-- Lumi Avatar -->
	<div class="lumi-header">
		<div class="lumi-avatar-wrapper">
			<div class="lumi-glow"></div>
			<img src="/lumi-mascot.png" alt="Lumi — your AI science tutor" class="lumi-avatar" />
		</div>
		<div class="lumi-name-tag">
			<span class="lumi-name">Lumi</span>
			<span class="lumi-role">AI Science Tutor</span>
		</div>
	</div>

	<!-- Chat Area -->
	<div class="chat-area">
		{#if isThinking}
			<div class="speech-bubble">
				<div class="typing-indicator">
					<span class="dot"></span>
					<span class="dot"></span>
					<span class="dot"></span>
				</div>
			</div>
		{:else if uiState.aiResponse}
			<div class="speech-bubble">
				<p class="response-text">{uiState.aiResponse}</p>
			</div>
		{:else}
			<div class="speech-bubble greeting">
				<p class="response-text">Hi there! 👋 I'm <strong>Lumi</strong>, your science tutor. Ask me anything about your experiment!</p>
			</div>
		{/if}
	</div>

	<!-- Input Area -->
	<div class="input-area">
		<input
			type="text"
			placeholder="Ask Lumi a question..."
			bind:value={uiState.aiPrompt}
			onkeydown={handleKeydown}
			disabled={isThinking}
		/>
		<button onclick={handleAskAI} disabled={isThinking || !uiState.aiPrompt.trim()} class:thinking={isThinking}>
			{#if isThinking}
				<span class="btn-spinner"></span>
			{:else}
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<line x1="22" y1="2" x2="11" y2="13"></line>
					<polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
				</svg>
			{/if}
		</button>
	</div>
</div>

<style>
/* ── Panel layout ── */
.ai-panel {
	display: flex;
	flex-direction: column;
	height: 100%;
	gap: 0;
}

/* ── Lumi header ── */
.lumi-header {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 12px 0 8px;
	flex-shrink: 0;
}

.lumi-avatar-wrapper {
	position: relative;
	width: 120px;
	height: 120px;
	display: flex;
	align-items: center;
	justify-content: center;
	animation: lumi-float 3s ease-in-out infinite;
}

.lumi-glow {
	position: absolute;
	inset: -8px;
	border-radius: 50%;
	background: radial-gradient(circle, #ffdd5740 0%, #ffdd5715 50%, transparent 70%);
	animation: glow-pulse 2.5s ease-in-out infinite alternate;
	pointer-events: none;
}

.lumi-avatar {
	width: 110px;
	height: 110px;
	object-fit: contain;
	border-radius: 50%;
	filter: drop-shadow(0 4px 12px rgba(255, 200, 60, 0.3));
	z-index: 1;
}

.lumi-name-tag {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-top: 6px;
	gap: 1px;
}

.lumi-name {
	font-family: 'Fredoka One', 'Segoe UI', sans-serif;
	font-size: 1.1rem;
	background: linear-gradient(135deg, #ffd54f, #ffab40);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
	background-clip: text;
	letter-spacing: 0.04em;
}

.lumi-role {
	font-size: 0.6rem;
	color: #4a6a7a;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	font-weight: 600;
}

/* ── Chat area ── */
.chat-area {
	flex: 1;
	overflow-y: auto;
	padding: 8px 4px;
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	min-height: 0;
}

.speech-bubble {
	position: relative;
	background: linear-gradient(135deg, #1a2540, #162035);
	border: 1px solid #2a3a55;
	border-radius: 14px;
	border-top-left-radius: 4px;
	padding: 12px 14px;
	margin: 0;
	box-shadow:
		0 2px 12px rgba(0, 0, 0, 0.25),
		inset 0 1px 0 rgba(255, 255, 255, 0.04);
	animation: bubble-in 0.3s ease-out;
}

.speech-bubble::before {
	content: '';
	position: absolute;
	top: -6px;
	left: 14px;
	width: 12px;
	height: 12px;
	background: linear-gradient(135deg, #1a2540, #162035);
	border-left: 1px solid #2a3a55;
	border-top: 1px solid #2a3a55;
	transform: rotate(45deg);
}

.speech-bubble.greeting {
	border-color: #2a4a55;
	background: linear-gradient(135deg, #152535, #132530);
}
.speech-bubble.greeting::before {
	background: linear-gradient(135deg, #152535, #132530);
	border-color: #2a4a55;
}

.response-text {
	margin: 0;
	font-size: 0.85rem;
	line-height: 1.55;
	color: #c8d8e8;
	overflow-wrap: break-word;
}

.response-text strong {
	color: #ffd54f;
}

/* ── Typing indicator ── */
.typing-indicator {
	display: flex;
	gap: 5px;
	padding: 2px 4px;
}

.dot {
	width: 7px;
	height: 7px;
	border-radius: 50%;
	background: #ffd54f;
	animation: typing-bounce 1.2s ease-in-out infinite;
}

.dot:nth-child(2) { animation-delay: 0.15s; }
.dot:nth-child(3) { animation-delay: 0.3s; }

/* ── Input area ── */
.input-area {
	display: flex;
	gap: 8px;
	padding: 10px 0 4px;
	flex-shrink: 0;
}

input {
	flex: 1;
	padding: 10px 14px;
	border-radius: 10px;
	border: 1.5px solid #2a3a55;
	background-color: #131b2e;
	color: #e0e8f0;
	font-size: 0.82rem;
	font-family: inherit;
	transition: all 0.2s ease;
}

input::placeholder {
	color: #3a5a6a;
}

input:focus {
	outline: none;
	border-color: #ffd54f;
	box-shadow: 0 0 12px rgba(255, 213, 79, 0.15);
	background-color: #161e32;
}

input:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

button {
	width: 40px;
	height: 40px;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	border: none;
	border-radius: 10px;
	background: linear-gradient(135deg, #ffd54f, #ffab40);
	color: #1a1a2e;
	cursor: pointer;
	transition: all 0.2s ease;
	padding: 0;
}

button:hover:not(:disabled) {
	transform: translateY(-1px);
	box-shadow: 0 4px 16px rgba(255, 213, 79, 0.35);
}

button:active:not(:disabled) {
	transform: translateY(0);
}

button:disabled {
	opacity: 0.4;
	cursor: not-allowed;
}

button.thinking {
	background: linear-gradient(135deg, #2a3a55, #1a2a40);
}

.btn-spinner {
	width: 16px;
	height: 16px;
	border: 2px solid #ffd54f40;
	border-top-color: #ffd54f;
	border-radius: 50%;
	animation: spin 0.7s linear infinite;
}

/* ── Animations ── */
@keyframes lumi-float {
	0%, 100% { transform: translateY(0); }
	50% { transform: translateY(-6px); }
}

@keyframes glow-pulse {
	from { opacity: 0.6; transform: scale(1); }
	to   { opacity: 1; transform: scale(1.08); }
}

@keyframes bubble-in {
	from { opacity: 0; transform: translateY(6px) scale(0.97); }
	to   { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes typing-bounce {
	0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
	30% { transform: translateY(-6px); opacity: 1; }
}

@keyframes spin {
	to { transform: rotate(360deg); }
}

/* ── Scrollbar ── */
.chat-area::-webkit-scrollbar { width: 4px; }
.chat-area::-webkit-scrollbar-track { background: transparent; }
.chat-area::-webkit-scrollbar-thumb {
	background: #2a3a55;
	border-radius: 2px;
}
.chat-area::-webkit-scrollbar-thumb:hover { background: #3a5a75; }
</style>
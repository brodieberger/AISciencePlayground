<script lang="ts">
	import { askAI } from '$lib/game-ui.svelte';
	import { uiState, physicsGameState } from '$lib/game-ui.svelte';
	import { buildPhysicsContext } from '$lib/physics/game.svelte';
	import { levels as physicsLevels } from '$lib/physics/level-data';
	import { buildChemistryContext, gameState as chemState, levels as chemLevels } from '$lib/chemistry/game.svelte';
	import { buildCircuitryContext, gameState as circuitState, levels as circuitLevels } from '$lib/circuitry/game.svelte';

	let isThinking = $state(false);
	let hasAsked = $state(false);

	/* ── Beginner preset questions (hardcoded, shown before first interaction) ── */
	const presetData: Record<string, { question: string; answer: string }[]> = {
		physics: [
			{
				question: 'What is my goal?',
				answer: 'Get the ball to the goal by placing objects to guide it there!'
			},
			{
				question: 'How do I play?',
				answer:
					'Drag objects from your inventory onto the board, then click "Release Ball" to see what happens!'
			},
			{
				question: 'What forces are at work here?',
				answer:
					'Gravity pulls the ball down and it rolls using momentum — use ramps and surfaces to steer it!'
			}
		],
		chemistry: [
			{
				question: 'What is my goal?',
				answer: 'Combine the right elements to create the target compound shown below!'
			},
			{
				question: 'How do I play?',
				answer:
					'Pick elements from the list and mix them together — try different combos to reach the goal!'
			},
			{
				question: 'What elements should I combine?',
				answer: 'Check the target formula for clues — the letters tell you which elements you need!'
			}
		],
		circuitry: [
			{
				question: 'What is my goal?',
				answer: 'Connect wires and components to complete the circuit and light up all the bulbs!'
			},
			{
				question: 'How do I play?',
				answer: 'Drag wires between components to build a path from the battery to the lights!'
			},
			{
				question: 'How does a circuit work?',
				answer:
					'Electricity flows in a loop — it needs a complete path from the battery and back to work!'
			}
		]
	};

	function getPresets(): { question: string; answer: string }[] {
		return presetData[uiState.gameType] ?? presetData.physics;
	}

	/* ── Dynamic context-aware questions (generated from live game state) ── */

	function getDynamicQuestions(): string[] {
		switch (uiState.gameType) {
			case 'physics':
				return getPhysicsDynamic();
			case 'chemistry':
				return getChemistryDynamic();
			case 'circuitry':
				return getCircuitryDynamic();
			default:
				return [];
		}
	}

	function getPhysicsDynamic(): string[] {
		const questions: string[] = [];
		const level = physicsLevels[physicsGameState.currentLevelIndex];
		const inv = physicsGameState.inventory;

		// Items remaining — ask about what they can do
		const remaining = inv.filter(i => i.count > 0);
		if (remaining.length > 0) {
			const names = remaining.map(i => i.type).join(' and ');
			questions.push(`What should I do with my ${names}?`);
		}

		// All items placed — ask what to try next
		if (remaining.length === 0) {
			questions.push('I placed everything — what should I try now?');
		}

		// Level-specific curiosity
		const prefabTypes = level.prefabs.map(p => p.type);
		if (prefabTypes.includes('bouncepad')) {
			questions.push('How does the bounce pad work?');
		}
		if (prefabTypes.includes('seesaw')) {
			questions.push('How does the seesaw launch the ball?');
		}
		if (prefabTypes.includes('ramp')) {
			questions.push('How do ramps change the ball\'s direction?');
		}

		// Ask about goal if stuck
		if (!uiState.goalReached) {
			questions.push('Can you give me a hint?');
		} else {
			questions.push('Why did that solution work?');
		}

		return questions.slice(0, 3);
	}

	function getChemistryDynamic(): string[] {
		const questions: string[] = [];
		const level = chemLevels[chemState.currentLevelIndex];
		const slots = chemState.selectedSlots;
		const result = chemState.lastResult;

		// Has elements selected but hasn't reacted yet
		if (slots.length > 0 && !result) {
			const elNames = slots.map(s => s.element.name).join(' and ');
			questions.push(`What happens when I mix ${elNames}?`);
		}

		// Reacted but didn't hit the goal
		if (result && !chemState.goalReached && level.targetFormula) {
			questions.push(`I made ${result.commonName} — how is that different from the goal?`);
			questions.push(`What elements do I need for ${level.targetFormula}?`);
		}

		// Reacted and hit the goal
		if (result && chemState.goalReached) {
			questions.push(`Why do these elements make ${result.commonName}?`);
			questions.push(`What is ${result.commonName} used for in real life?`);
		}

		// No elements selected yet
		if (slots.length === 0 && !result) {
			if (level.targetFormula) {
				questions.push(`How do I make ${level.targetFormula}?`);
			}
			questions.push('Which elements should I start with?');
		}

		// Sandbox mode
		if (level.sandboxMode) {
			questions.push('What\'s a cool reaction I should try?');
		}

		return questions.slice(0, 3);
	}

	function getCircuitryDynamic(): string[] {
		const questions: string[] = [];
		const level = circuitLevels[circuitState.levelIndex];

		// Short circuit detected
		if (circuitState.shortCircuit) {
			questions.push('Why is my circuit short-circuiting?');
			questions.push('How do I fix a short circuit?');
		}

		// Some bulbs lit but not all
		if (circuitState.activeLights > 0 && circuitState.activeLights < circuitState.totalLights) {
			questions.push(`Only ${circuitState.activeLights} of ${circuitState.totalLights} bulbs are lit — why?`);
			questions.push('How do I light up all the bulbs?');
		}

		// No bulbs lit yet
		if (circuitState.totalLights > 0 && circuitState.activeLights === 0 && !circuitState.shortCircuit) {
			questions.push('Why aren\'t my bulbs lighting up?');
			questions.push('Can you give me a hint for this level?');
		}

		// Solved!
		if (circuitState.solved && circuitState.activeLights === circuitState.totalLights) {
			questions.push('Why does this circuit work?');
		}

		// Level-specific questions based on available components
		if (level.available.includes('switch')) {
			questions.push('What does a switch do in a circuit?');
		}
		if (level.available.includes('resistor') && !circuitState.solved) {
			questions.push('When should I use a resistor?');
		}

		return questions.slice(0, 3);
	}

	/* ── Handlers ── */

	async function handleAskAI() {
		if (!uiState.aiPrompt.trim() || isThinking) return;

		hasAsked = true;
		const context = getContextForGame();
		isThinking = true;
		uiState.aiResponse = '';

		const reply = await askAI(uiState.gameType, uiState.aiPrompt, context);

		isThinking = false;
		uiState.aiResponse = reply;
		uiState.aiPrompt = '';
	}

	function handlePresetClick(preset: { question: string; answer: string }) {
		hasAsked = true;
		uiState.aiResponse = preset.answer;
	}

	async function handleDynamicClick(question: string) {
		if (isThinking) return;
		uiState.aiPrompt = question;
		await handleAskAI();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleAskAI();
		}
	}

	function getContextForGame() {
		switch (uiState.gameType) {
			case 'physics':
				return buildPhysicsContext();
			case 'circuitry':
				return buildCircuitryContext();
			case 'chemistry':
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

			<!-- Dynamic context-aware follow-up questions -->
			{#if getDynamicQuestions().length > 0}
				<div class="dynamic-questions">
					{#each getDynamicQuestions() as question}
						<button
							class="preset-btn dynamic-btn"
							onclick={() => handleDynamicClick(question)}
							disabled={isThinking}
						>
							💡 {question}
						</button>
					{/each}
				</div>
			{/if}
		{:else}
			<div class="speech-bubble greeting">
				<p class="response-text">
					Hi there! 👋 I'm <strong>Lumi</strong>, your science tutor. Ask me anything about your
					experiment!
				</p>
			</div>

			<!-- Beginner preset questions -->
			{#if !hasAsked}
				<div class="preset-questions">
					{#each getPresets() as preset}
						<button
							class="preset-btn"
							onclick={() => handlePresetClick(preset)}
							disabled={isThinking}
						>
							{preset.question}
						</button>
					{/each}
				</div>
			{/if}
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
		<button
			onclick={handleAskAI}
			disabled={isThinking || !uiState.aiPrompt.trim()}
			class:thinking={isThinking}
		>
			{#if isThinking}
				<span class="btn-spinner"></span>
			{:else}
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
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

	.dot:nth-child(2) {
		animation-delay: 0.15s;
	}
	.dot:nth-child(3) {
		animation-delay: 0.3s;
	}

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

	/* ── Preset question buttons ── */
	.preset-questions {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 8px 0 2px;
		flex-shrink: 0;
		animation: presets-in 0.35s ease-out;
	}

	.preset-btn {
		width: 100% !important;
		height: auto !important;
		padding: 8px 12px !important;
		border-radius: 8px !important;
		background: transparent !important;
		border: 1.5px solid #2a3a55 !important;
		color: #a0b8cc !important;
		font-size: 0.78rem;
		font-family: inherit;
		text-align: left;
		line-height: 1.3;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.preset-btn:hover:not(:disabled) {
		border-color: #ffd54f !important;
		color: #ffd54f !important;
		background: rgba(255, 213, 79, 0.06) !important;
		transform: translateY(-1px) !important;
		box-shadow: 0 2px 10px rgba(255, 213, 79, 0.12) !important;
	}

	.preset-btn:active:not(:disabled) {
		transform: translateY(0) !important;
	}

	.preset-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	/* ── Dynamic follow-up questions ── */
	.dynamic-questions {
		display: flex;
		flex-direction: column;
		gap: 5px;
		padding: 8px 0 2px;
		flex-shrink: 0;
		animation: presets-in 0.35s ease-out;
	}

	.dynamic-btn {
		border-color: #1e3a4a !important;
		background: rgba(255, 213, 79, 0.03) !important;
	}

	.dynamic-btn:hover:not(:disabled) {
		border-color: #ffd54f !important;
		color: #ffd54f !important;
		background: rgba(255, 213, 79, 0.08) !important;
	}

	@keyframes presets-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* ── Animations ── */
	@keyframes lumi-float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-6px);
		}
	}

	@keyframes glow-pulse {
		from {
			opacity: 0.6;
			transform: scale(1);
		}
		to {
			opacity: 1;
			transform: scale(1.08);
		}
	}

	@keyframes bubble-in {
		from {
			opacity: 0;
			transform: translateY(6px) scale(0.97);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@keyframes typing-bounce {
		0%,
		60%,
		100% {
			transform: translateY(0);
			opacity: 0.4;
		}
		30% {
			transform: translateY(-6px);
			opacity: 1;
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ── Scrollbar ── */
	.chat-area::-webkit-scrollbar {
		width: 4px;
	}
	.chat-area::-webkit-scrollbar-track {
		background: transparent;
	}
	.chat-area::-webkit-scrollbar-thumb {
		background: #2a3a55;
		border-radius: 2px;
	}
	.chat-area::-webkit-scrollbar-thumb:hover {
		background: #3a5a75;
	}
</style>

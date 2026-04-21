<script lang="ts">
	import { uiState } from '$lib/game-ui.svelte';
	import { onMount } from 'svelte';

	// Lumi reacts to the AI state
	let isThinking = $derived(uiState.aiPrompt.length > 0);

	// Typewriter state
	let displayedText = $state('');
	let isSpeaking = $state(false);
	let lastResponse = $state('');
	let typewriterTimer: ReturnType<typeof setTimeout> | null = null;

	// Watch for new AI responses and trigger typewriter
	$effect(() => {
		const response = uiState.aiResponse;
		if (response && response !== lastResponse) {
			lastResponse = response;
			startTypewriter(response);
		}
	});

	function startTypewriter(text: string) {
		// Clear any existing timer
		if (typewriterTimer) clearTimeout(typewriterTimer);
		displayedText = '';
		isSpeaking = true;

		let i = 0;
		function typeNext() {
			if (i < text.length) {
				displayedText = text.slice(0, i + 1);
				i++;
				// Variable speed for natural feel
				const char = text[i - 1];
				const delay = char === '.' || char === '!' || char === '?' ? 120 :
				              char === ',' ? 60 : 
				              18 + Math.random() * 15;
				typewriterTimer = setTimeout(typeNext, delay);
			} else {
				isSpeaking = false;
			}
		}
		typeNext();
	}

	// Clean up on destroy
	onMount(() => {
		return () => {
			if (typewriterTimer) clearTimeout(typewriterTimer);
		};
	});
</script>

<div class="lumi-container" class:thinking={isThinking} class:speaking={isSpeaking}>
	<div class="lumi-glow" aria-hidden="true"></div>
	
	<!-- Speech bubble -->
	{#if displayedText}
		<div class="speech-bubble" class:bubble-speaking={isSpeaking}>
			<p class="speech-text">{displayedText}<span class="cursor" class:cursor-visible={isSpeaking}>|</span></p>
			<div class="speech-tail" aria-hidden="true"></div>
		</div>
	{/if}

	<svg
		class="lumi"
		viewBox="0 0 200 280"
		xmlns="http://www.w3.org/2000/svg"
		role="img"
		aria-label="Lumi the lightbulb mascot"
	>
		<defs>
			<!-- Warm glow gradient for bulb -->
			<radialGradient id="bulb-glow" cx="50%" cy="40%" r="55%">
				<stop offset="0%" stop-color="#FFF9C4" />
				<stop offset="40%" stop-color="#FFE082" />
				<stop offset="75%" stop-color="#FFD54F" />
				<stop offset="100%" stop-color="#FFC107" />
			</radialGradient>
			<!-- Highlight shimmer -->
			<radialGradient id="bulb-highlight" cx="35%" cy="30%" r="30%">
				<stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.7" />
				<stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
			</radialGradient>
			<!-- Inner warm glow -->
			<radialGradient id="inner-glow" cx="50%" cy="45%" r="40%">
				<stop offset="0%" stop-color="#FFEE58" stop-opacity="0.6" />
				<stop offset="100%" stop-color="#FFD54F" stop-opacity="0" />
			</radialGradient>
			<!-- Shadow filter -->
			<filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
				<feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.15" />
			</filter>
			<!-- Outer glow filter -->
			<filter id="outer-glow" x="-50%" y="-50%" width="200%" height="200%">
				<feGaussianBlur in="SourceGraphic" stdDeviation="8" />
			</filter>
		</defs>

		<!-- Ambient glow behind bulb -->
		<ellipse
			class="ambient-glow"
			cx="100"
			cy="95"
			rx="70"
			ry="65"
			fill="#FFEE58"
			opacity="0.15"
			filter="url(#outer-glow)"
		/>

		<!-- Lightbulb body -->
		<g class="bulb-body" filter="url(#soft-shadow)">
			<!-- Main bulb shape -->
			<path
				d="M100 15
				   C 55 15, 25 55, 25 95
				   C 25 130, 45 150, 60 165
				   C 65 170, 68 178, 68 185
				   L 132 185
				   C 132 178, 135 170, 140 165
				   C 155 150, 175 130, 175 95
				   C 175 55, 145 15, 100 15 Z"
				fill="url(#bulb-glow)"
				stroke="#E6B800"
				stroke-width="2"
			/>
			<!-- Highlight -->
			<ellipse cx="80" cy="65" rx="30" ry="35" fill="url(#bulb-highlight)" />
			<!-- Inner glow -->
			<ellipse cx="100" cy="90" rx="40" ry="40" fill="url(#inner-glow)" />
		</g>

		<!-- Screw base -->
		<g class="screw-base">
			<rect x="65" y="185" width="70" height="10" rx="2" fill="#9E9E9E" stroke="#757575" stroke-width="1" />
			<rect x="68" y="195" width="64" height="8" rx="2" fill="#BDBDBD" stroke="#9E9E9E" stroke-width="1" />
			<rect x="71" y="203" width="58" height="8" rx="2" fill="#9E9E9E" stroke="#757575" stroke-width="1" />
			<rect x="74" y="211" width="52" height="8" rx="2" fill="#BDBDBD" stroke="#9E9E9E" stroke-width="1" />
			<!-- Bottom tip -->
			<path d="M80 219 L120 219 L108 235 C105 240, 95 240, 92 235 Z" fill="#757575" stroke="#616161" stroke-width="1" />
		</g>

		<!-- Face -->
		<g class="face">
			<!-- Left eye -->
			<g class="eye left-eye">
				<ellipse cx="78" cy="95" rx="13" ry="14" fill="white" stroke="#795548" stroke-width="1.5" />
				<ellipse class="pupil" cx="80" cy="96" rx="6" ry="7" fill="#37474F" />
				<ellipse cx="76" cy="91" rx="3" ry="3.5" fill="white" opacity="0.9" />
			</g>
			<!-- Right eye -->
			<g class="eye right-eye">
				<ellipse cx="122" cy="95" rx="13" ry="14" fill="white" stroke="#795548" stroke-width="1.5" />
				<ellipse class="pupil" cx="124" cy="96" rx="6" ry="7" fill="#37474F" />
				<ellipse cx="120" cy="91" rx="3" ry="3.5" fill="white" opacity="0.9" />
			</g>
			<!-- Blink overlay (animated) -->
			<ellipse class="blink left-blink" cx="78" cy="95" rx="14" ry="0" fill="#FFD54F" />
			<ellipse class="blink right-blink" cx="122" cy="95" rx="14" ry="0" fill="#FFD54F" />

			<!-- Mouth — switches between smile and talking mouth -->
			{#if isSpeaking}
				<!-- Talking mouth: animated open/close oval -->
				<ellipse
					class="talking-mouth"
					cx="100"
					cy="125"
					rx="8"
					ry="5"
					fill="#5D4037"
					stroke="#795548"
					stroke-width="1.5"
				/>
			{:else}
				<!-- Default smile -->
				<path
					class="mouth"
					d="M82 118 Q100 138, 118 118"
					fill="none"
					stroke="#795548"
					stroke-width="2.5"
					stroke-linecap="round"
				/>
			{/if}
		</g>

		<!-- Sparkle particles around Lumi -->
		<g class="sparkles">
			<circle class="sparkle s1" cx="35" cy="50" r="2.5" fill="#FFEE58" />
			<circle class="sparkle s2" cx="165" cy="55" r="2" fill="#FFF9C4" />
			<circle class="sparkle s3" cx="28" cy="130" r="1.8" fill="#FFD54F" />
			<circle class="sparkle s4" cx="172" cy="125" r="2.2" fill="#FFEE58" />
			<circle class="sparkle s5" cx="55" cy="25" r="1.5" fill="#FFF9C4" />
			<circle class="sparkle s6" cx="148" cy="22" r="1.8" fill="#FFD54F" />
		</g>
	</svg>

	<!-- Name tag -->
	<span class="lumi-name">Lumi</span>
</div>

<style>
	.lumi-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative;
		width: 100%;
		max-width: 180px;
		margin: 0 auto 8px;
		user-select: none;
	}

	/* Ambient background glow */
	.lumi-glow {
		position: absolute;
		top: 10%;
		left: 50%;
		transform: translateX(-50%);
		width: 140px;
		height: 140px;
		border-radius: 50%;
		background: radial-gradient(circle, #FFD54F30 0%, #FFD54F10 40%, transparent 70%);
		animation: glow-pulse 3s ease-in-out infinite alternate;
		pointer-events: none;
	}

	.lumi {
		width: 100%;
		height: auto;
		display: block;
		animation: float 4s ease-in-out infinite;
		filter: drop-shadow(0 8px 20px rgba(255, 213, 79, 0.3));
	}

	/* ── Speech Bubble ── */
	.speech-bubble {
		position: relative;
		background: linear-gradient(135deg, #1a2a3a 0%, #162030 100%);
		border: 1.5px solid #FFD54F50;
		border-radius: 12px;
		padding: 10px 14px;
		margin-bottom: 8px;
		max-width: 260px;
		min-width: 120px;
		box-shadow:
			0 4px 20px rgba(0, 0, 0, 0.3),
			0 0 15px rgba(255, 213, 79, 0.08),
			inset 0 1px 0 rgba(255, 255, 255, 0.05);
		animation: bubble-appear 0.3s ease-out;
	}

	.bubble-speaking {
		border-color: #FFD54F80;
		box-shadow:
			0 4px 20px rgba(0, 0, 0, 0.3),
			0 0 20px rgba(255, 213, 79, 0.12),
			inset 0 1px 0 rgba(255, 255, 255, 0.05);
	}

	@keyframes bubble-appear {
		from {
			opacity: 0;
			transform: scale(0.8) translateY(8px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	.speech-text {
		margin: 0;
		font-size: 0.78rem;
		line-height: 1.5;
		color: #e0e8f0;
		font-family: 'Nunito', sans-serif;
	}

	.cursor {
		display: inline;
		opacity: 0;
		color: #FFD54F;
		font-weight: bold;
		margin-left: 1px;
	}
	.cursor-visible {
		animation: cursor-blink 0.6s step-end infinite;
	}
	@keyframes cursor-blink {
		0%, 50% { opacity: 1; }
		51%, 100% { opacity: 0; }
	}

	/* Speech bubble tail (triangle pointing down toward Lumi) */
	.speech-tail {
		position: absolute;
		bottom: -8px;
		left: 50%;
		transform: translateX(-50%);
		width: 0;
		height: 0;
		border-left: 8px solid transparent;
		border-right: 8px solid transparent;
		border-top: 8px solid #1a2a3a;
		filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.2));
	}

	/* ── Float animation ── */
	@keyframes float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-8px); }
	}

	/* ── Glow pulsing ── */
	@keyframes glow-pulse {
		from {
			opacity: 0.6;
			transform: translateX(-50%) scale(1);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) scale(1.15);
		}
	}

	/* ── Ambient glow animation ── */
	.ambient-glow {
		animation: ambient-breathe 3s ease-in-out infinite alternate;
	}
	@keyframes ambient-breathe {
		from { opacity: 0.1; }
		to { opacity: 0.25; }
	}

	/* ── Blink animation ── */
	.blink {
		animation: blink-anim 4s ease-in-out infinite;
	}
	.right-blink {
		animation-delay: 0.05s;
	}
	@keyframes blink-anim {
		0%, 90%, 100% { ry: 0; }
		95% { ry: 15; }
	}

	/* ── Talking mouth animation ── */
	.talking-mouth {
		animation: mouth-move 0.3s ease-in-out infinite alternate;
	}
	@keyframes mouth-move {
		0% { ry: 3; rx: 7; }
		50% { ry: 7; rx: 9; }
		100% { ry: 4; rx: 6; }
	}

	/* ── Sparkles ── */
	.sparkle {
		animation: sparkle-twinkle 2s ease-in-out infinite;
	}
	.s1 { animation-delay: 0s; }
	.s2 { animation-delay: 0.4s; }
	.s3 { animation-delay: 0.8s; }
	.s4 { animation-delay: 1.2s; }
	.s5 { animation-delay: 1.6s; }
	.s6 { animation-delay: 0.2s; }

	@keyframes sparkle-twinkle {
		0%, 100% { opacity: 0.2; transform: scale(0.8); }
		50% { opacity: 1; transform: scale(1.3); }
	}

	/* ── Name tag ── */
	.lumi-name {
		font-family: 'Fredoka One', cursive;
		font-size: 1rem;
		color: #FFD54F;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		text-shadow: 0 0 12px #FFD54F60, 0 0 24px #FFD54F30;
		margin-top: -4px;
		animation: name-glow 2.5s ease-in-out infinite alternate;
	}
	@keyframes name-glow {
		from { text-shadow: 0 0 8px #FFD54F40, 0 0 16px #FFD54F20; }
		to { text-shadow: 0 0 16px #FFD54F80, 0 0 32px #FFD54F40; }
	}

	/* ── Thinking state — faster float & intense glow ── */
	.thinking .lumi {
		animation: float 1.5s ease-in-out infinite;
		filter: drop-shadow(0 8px 28px rgba(255, 213, 79, 0.5));
	}
	.thinking .lumi-glow {
		animation: glow-pulse 1s ease-in-out infinite alternate;
		background: radial-gradient(circle, #FFD54F50 0%, #FFD54F20 40%, transparent 70%);
	}

	/* ── Speaking state — excited glow ── */
	.speaking .lumi {
		filter: drop-shadow(0 8px 24px rgba(255, 213, 79, 0.45));
	}
	.speaking .lumi-glow {
		animation: glow-pulse 1.5s ease-in-out infinite alternate;
		background: radial-gradient(circle, #FFD54F45 0%, #FFD54F18 40%, transparent 70%);
	}
	.speaking .lumi-name {
		color: #FFEE58;
	}
</style>

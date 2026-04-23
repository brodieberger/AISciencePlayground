<script lang="ts">
	import { levelDown, levelUp, releaseCage, resetBall, resetGame, undoLastPrefab } from '$lib/physics/game.svelte';
	import { uiState, physicsGameState } from '$lib/game-ui.svelte';
	import type { PrefabType } from '$lib/physics/level-data';

	function handleReset() {
		resetGame();
		uiState.goalReached = false;
		uiState.aiResponse = '';
	}

	const prefabLabels: Record<PrefabType, string> = {
		bridge: '🪵 Bridge',
		bouncepad: '🟣 Bounce Pad',
		bumper: '🔵 Bumper',
		seesaw: '⚖️ Seesaw',
	};

	function onDragStart(type: PrefabType) {
		physicsGameState.activePrefab = type;
	}

	function onDragEnd() {
		// If dropped outside the canvas the activePrefab stays set —
		// the canvas drop handler clears it on success. Clear it here too
		// so a failed drag doesn't leave the cursor stuck.
		physicsGameState.activePrefab = null;
	}

	function selectPrefab(type: PrefabType) {
		physicsGameState.activePrefab =
			physicsGameState.activePrefab === type ? null : type;
	}
</script>

<div class="ui">
	<div class="controls">
		<button class="btn-reset" onclick={handleReset}>Reset</button>
		<button class="btn-undo" onclick={undoLastPrefab}>Undo</button>
		{#if physicsGameState.cageReleased}
			<button class="btn-release" onclick={resetBall}>Reset Ball</button>
		{:else}
			<button class="btn-release" onclick={releaseCage}>Release Cage</button>
		{/if}
		<button class="btn-nav" onclick={levelDown}>⬅️</button>
		<p>Current Level: {physicsGameState.currentLevelIndex + 1}</p>
		<button class="btn-nav" onclick={levelUp}>➡️</button>
	</div>

	{#if physicsGameState.inventory.length > 0}
		<div class="inventory">
			<span class="inventory-label">Toolbox</span>
			<div class="inventory-items">
				{#each physicsGameState.inventory as slot}
					<div
						class="prefab-chip"
						class:active={physicsGameState.activePrefab === slot.type}
						class:exhausted={slot.count === 0}
						draggable={slot.count > 0}
						role="button"
						tabindex={slot.count > 0 ? 0 : -1}
						ondragstart={() => slot.count > 0 && onDragStart(slot.type)}
						ondragend={onDragEnd}
						onclick={() => slot.count > 0 && selectPrefab(slot.type)}
						onkeydown={(e) => e.key === 'Enter' && slot.count > 0 && selectPrefab(slot.type)}
					>
						{prefabLabels[slot.type as PrefabType]}
						<span class="count">{slot.count > 0 ? `x${slot.count}` : '✕'}</span>
					</div>
				{/each}
			</div>
			<span class="hint">Click placed item to rotate · Right-click to remove · Ctrl+Z to undo</span>
		</div>
	{/if}
</div>

<style>
.ui {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.controls {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	margin-top: 5px;
	height: 40px;
}

button {
	padding: 8px 12px;
	border-radius: 4px;
	border: none;
	font-weight: bold;
	cursor: pointer;
	transition: all 0.2s ease;
	height: 40px;
}

.btn-reset    { background-color: #ff6666; color: #0b1020; }
.btn-reset:hover { background-color: #ff4444; box-shadow: 0 0 12px #ff4444; }
.btn-undo     { background-color: #ffaa44; color: #0b1020; }
.btn-undo:hover  { background-color: #ff8800; box-shadow: 0 0 12px #ff8800; }
.btn-release  { background-color: #66ff66; color: #0b1020; }
.btn-release:hover { background-color: #44ff44; box-shadow: 0 0 12px #44ff44; }
.btn-nav      { background-color: #66ccff; color: #0b1020; }
.btn-nav:hover   { background-color: #33aaff; box-shadow: 0 0 12px #33aaff; }

.inventory {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.inventory-label {
	font-size: 0.75rem;
	color: #88aacc;
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.inventory-items {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.prefab-chip {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 6px 12px;
	border-radius: 6px;
	background: #1a2540;
	border: 2px solid #334466;
	color: #cce0ff;
	font-size: 0.85rem;
	cursor: grab;
	user-select: none;
	transition: border-color 0.15s, box-shadow 0.15s;
}

.prefab-chip:hover:not(.exhausted) {
	border-color: #66ccff;
	box-shadow: 0 0 8px #66ccff55;
}

.prefab-chip.active {
	border-color: #66ccff;
	box-shadow: 0 0 14px #66ccffaa;
	background: #1e3050;
}

.prefab-chip.exhausted {
	opacity: 0.35;
	cursor: default;
	border-color: #223;
}

.count {
	font-size: 0.75rem;
	color: #88aacc;
}

.hint {
	font-size: 0.65rem;
	color: #445566;
	letter-spacing: 0.03em;
}
</style>
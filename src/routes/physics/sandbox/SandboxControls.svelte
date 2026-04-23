<script lang="ts">
	import { releaseCage, resetBall, resetGame, setSandboxDrawMode, clearAllPrefabs, undoLastPrefab } from '$lib/physics/game.svelte';
	import { uiState, physicsGameState } from '$lib/game-ui.svelte';
	import type { PrefabType } from '$lib/physics/level-data';

	function handleReset() {
		resetGame();
		uiState.goalReached = false;
		uiState.aiResponse = '';
	}

	function toggleDraw() {
		setSandboxDrawMode(!physicsGameState.sandboxDrawActive);
		if (physicsGameState.sandboxDrawActive) {
			physicsGameState.activePrefab = null;
		}
	}

	const prefabLabels: Record<PrefabType, string> = {
		bridge:    '🪵 Bridge',
		bouncepad: '🟣 Bounce Pad',
		bumper:    '🔵 Bumper',
		seesaw:    '⚖️ Seesaw',
	};

	function onDragStart(type: PrefabType) {
		physicsGameState.activePrefab = type;
		setSandboxDrawMode(false);
	}

	function onDragEnd() {
		physicsGameState.activePrefab = null;
	}

	function selectPrefab(type: PrefabType) {
		setSandboxDrawMode(false);
		physicsGameState.activePrefab =
			physicsGameState.activePrefab === type ? null : type;
	}
</script>

<div class="ui">
	<div class="controls">
		<button class="btn-reset"   onclick={handleReset}>Reset</button>
		<button class="btn-undo"    onclick={undoLastPrefab}>Undo</button>
		<button class="btn-clear"   onclick={clearAllPrefabs}>Clear All</button>
		<button
			class="btn-draw"
			class:active={physicsGameState.sandboxDrawActive}
			onclick={toggleDraw}
		>
			✏️ Draw
		</button>
		{#if physicsGameState.cageReleased}
			<button class="btn-release" onclick={resetBall}>Reset Ball</button>
		{:else}
			<button class="btn-release" onclick={releaseCage}>Release Cage</button>
		{/if}
	</div>

	<div class="inventory">
		<span class="inventory-label">Toolbox — unlimited</span>
		<div class="inventory-items">
			{#each physicsGameState.inventory as slot}
				<div
					class="prefab-chip"
					class:active={physicsGameState.activePrefab === slot.type}
					draggable="true"
					role="button"
					tabindex="0"
					ondragstart={() => onDragStart(slot.type)}
					ondragend={onDragEnd}
					onclick={() => selectPrefab(slot.type)}
					onkeydown={(e) => e.key === 'Enter' && selectPrefab(slot.type)}
				>
					{prefabLabels[slot.type as PrefabType]}
					<span class="count">x{slot.count}</span>
				</div>
			{/each}
		</div>
		<span class="hint">Click placed item to rotate · Right-click to remove · Ctrl+Z to undo</span>
	</div>
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
}

button {
	padding: 8px 12px;
	border-radius: 4px;
	border: none;
	font-weight: bold;
	cursor: pointer;
	transition: all 0.2s ease;
	height: 40px;
	font-family: inherit;
}

.btn-reset   { background: #ff6666; color: #0b1020; }
.btn-reset:hover { background: #ff4444; box-shadow: 0 0 12px #ff4444; }
.btn-undo    { background: #ffaa44; color: #0b1020; }
.btn-undo:hover  { background: #ff8800; box-shadow: 0 0 12px #ff8800; }
.btn-clear   { background: #ff6699; color: #0b1020; }
.btn-clear:hover { background: #ff3377; box-shadow: 0 0 12px #ff3377; }
.btn-draw    { background: #334466; color: #aaccff; border: 1.5px solid #446688; }
.btn-draw:hover  { background: #3a5070; box-shadow: 0 0 10px #66aaff55; }
.btn-draw.active { background: #1a3a66; border-color: #66aaff; box-shadow: 0 0 14px #66aaff88; color: #aaddff; }
.btn-release { background: #66ff66; color: #0b1020; }
.btn-release:hover { background: #44ff44; box-shadow: 0 0 12px #44ff44; }

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
.prefab-chip:hover {
	border-color: #66ccff;
	box-shadow: 0 0 8px #66ccff55;
}
.prefab-chip.active {
	border-color: #66ccff;
	box-shadow: 0 0 14px #66ccffaa;
	background: #1e3050;
}

.count { font-size: 0.75rem; color: #88aacc; }

.hint {
	font-size: 0.65rem;
	color: #445566;
	letter-spacing: 0.03em;
}
</style>

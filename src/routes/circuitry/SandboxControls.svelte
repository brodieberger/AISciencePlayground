<!-- src/routes/circuitry/SandboxControls.svelte -->
<script lang="ts">
    import { gameState, type ComponentType } from '$lib/circuitry/game.svelte';
    import { uiState } from '$lib/game-ui.svelte';

    let { selected = $bindable<ComponentType>('wire') }: { selected: ComponentType } = $props();

    const ALL_ITEMS: { type: ComponentType; label: string; icon: string; color: string }[] = [
        { type: 'battery',  label: 'Battery',  icon: '🔋', color: '#2a6a2a' },
        { type: 'wire',     label: 'Wire',      icon: '〰', color: '#2a5a8a' },
        { type: 'switch',   label: 'Switch',    icon: '⚡', color: '#6a3a8a' },
        { type: 'light',    label: 'Bulb',      icon: '💡', color: '#8a7a20' },
        { type: 'resistor', label: 'Resistor',  icon: '▬',  color: '#8a4a20' },
        { type: 'empty',    label: 'Eraser',    icon: '✕',  color: '#6a2a2a' },
    ];

    function handleReset() {
        const rows = gameState.grid.length;
        const cols = gameState.grid[0]?.length ?? 10;
        gameState.grid = Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => ({
                type: 'empty' as ComponentType,
                switchClosed: false, energized: false, lit: false, shortPath: false,
            }))
        );
        gameState.solved = false;
        gameState.shortCircuit = false;
        gameState.hint = 'Sandbox mode — build freely, no goal required!';
        gameState.activeLights = 0;
        gameState.totalLights = 0;
        uiState.aiResponse = '';
    }
</script>

<div class="controls">
    <div class="section">
        <div class="section-label">COMPONENTS</div>
        <div class="inv-row">
            {#each ALL_ITEMS as item}
                <button
                    class="inv-item"
                    class:active={selected === item.type}
                    style="--accent:{item.color}"
                    onclick={() => (selected = item.type)}
                    title={item.label}
                >
                    <span class="inv-icon">{item.icon}</span>
                    <span class="inv-label">{item.label}</span>
                    {#if selected === item.type}
                        <span class="sel-dot"></span>
                    {/if}
                </button>
            {/each}
        </div>
    </div>

    <div class="right-col">
        {#if gameState.hint}
            <div class="hint" class:hint-ok={gameState.solved} class:hint-err={gameState.shortCircuit}>
                {gameState.hint}
            </div>
        {/if}

        {#if gameState.totalLights > 0}
            <div class="progress">
                {#each Array(gameState.totalLights) as _, i}
                    <span class="pip" class:lit={i < gameState.activeLights}>💡</span>
                {/each}
                <span class="pip-label">{gameState.activeLights}/{gameState.totalLights} lit</span>
            </div>
        {/if}

        <div class="actions">
            <button class="btn btn-reset" onclick={handleReset}>↺ Reset</button>
        </div>

        <div class="key">
            <span><kbd>Left click</kbd> place</span>
            <span><kbd>Right click</kbd> remove</span>
            <span><kbd>Click switch</kbd> toggle</span>
        </div>
    </div>
</div>

<style>
    .controls {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        gap: 14px;
        padding: 6px 8px;
        overflow-x: auto;
        flex-wrap: nowrap;
        background: #0d1525;
        border-top: 1px solid #1a2a3a;
    }

    .section { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
    .section-label {
        font-size: 0.58rem; letter-spacing: 0.15em;
        color: #3a6a8a; font-weight: 700;
    }

    .inv-row { display: flex; gap: 4px; flex-wrap: nowrap; }

    .inv-item {
        position: relative;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 2px;
        width: 54px; height: 54px;
        background: #0d1828;
        border: 2px solid var(--accent, #2a4a6a);
        border-radius: 7px;
        cursor: pointer;
        transition: all 0.15s;
        padding: 3px; box-sizing: border-box;
        flex-shrink: 0;
        font-family: inherit; color: inherit;
    }
    .inv-item:hover {
        background: #152030;
        border-color: color-mix(in srgb, var(--accent) 80%, white);
        box-shadow: 0 0 10px color-mix(in srgb, var(--accent) 45%, transparent);
        transform: translateY(-1px);
    }
    .inv-item.active {
        background: color-mix(in srgb, var(--accent) 18%, #0a0f1a);
        border-color: color-mix(in srgb, var(--accent) 90%, white);
        box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 55%, transparent);
    }

    .inv-icon  { font-size: 1.3rem; line-height: 1; }
    .inv-label { font-size: 0.58rem; color: #7aaccc; text-align: center; letter-spacing:.03em; }
    .inv-item.active .inv-label { color: #e0f0ff; }

    .sel-dot {
        position: absolute; top: 3px; right: 3px;
        width: 6px; height: 6px; border-radius: 50%;
        background: color-mix(in srgb, var(--accent) 90%, white);
        box-shadow: 0 0 5px var(--accent);
    }

    .right-col {
        display: flex; flex-direction: column;
        gap: 5px; flex-shrink: 0;
        min-width: 150px; max-width: 500px;
    }

    .hint {
        padding: 6px 9px; background: #0d1828;
        border-left: 3px solid #3a8aee; border-radius: 3px;
        font-size: 0.74rem; color: #9abccc; line-height: 1.4;
    }
    .hint.hint-ok  { border-color: #44ff44; color: #aaeeaa; background: #0a1f0a; }
    .hint.hint-err { border-color: #ff5555; color: #eea0a0; background: #1f0a0a; }

    .progress { display: flex; align-items: center; gap: 4px; font-size: 0.72rem; color: #5a8aaa; }
    .pip { font-size: 0.85rem; opacity: .2; transition: opacity .2s; }
    .pip.lit { opacity: 1; filter: drop-shadow(0 0 4px #ddbb00); }
    .pip-label { margin-left: 3px; }

    .actions { display: flex; gap: 4px; }
    .btn {
        padding: 6px 11px; border-radius: 4px; border: none;
        font-weight: bold; cursor: pointer;
        font-size: 0.74rem; font-family: inherit;
        transition: all .18s;
    }
    .btn-reset        { background: #ff6666; color: #0b1020; }
    .btn-reset:hover  { background: #ff3333; box-shadow: 0 0 10px #ff3333; }

    .key { display: flex; flex-direction: column; gap: 2px; margin-top: 1px; }
    .key span { font-size: 0.63rem; color: #3a6a8a; display: flex; align-items: center; gap: 4px; }
    kbd {
        padding: 1px 4px; background: #0d1828;
        border: 1px solid #1e3550; border-radius: 3px;
        font-size: 0.6rem; color: #5a8aaa;
    }
</style>

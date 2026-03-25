<!-- src/routes/circuitry/GameControls.svelte -->
<script lang="ts">
    import {
        gameState,
        selectTool,
        rotateTool,
        clearAll,
        type ComponentType,
    } from '$lib/circuitry/game.svelte';

    const TOOLS: { id: ComponentType | 'delete'; icon: string; label: string; section?: string }[] = [
        { id: 'wire',     icon: '〰',  label: 'Wire',     section: 'TOOLS' },
        { id: 'delete',   icon: '✕',   label: 'Delete' },
        { id: 'battery',  icon: '🔋',  label: 'Battery',  section: 'COMPONENTS' },
        { id: 'switch',   icon: '⚡',  label: 'Switch' },
        { id: 'light',    icon: '💡',  label: 'Bulb' },
        { id: 'resistor', icon: '⬛',  label: 'Resistor' },
        { id: 'and',      icon: '⊓',   label: 'AND',      section: 'LOGIC' },
        { id: 'or',       icon: '⊔',   label: 'OR' },
        { id: 'not',      icon: '¬',   label: 'NOT' },
    ];
</script>

<div class="toolbar">
    {#each TOOLS as t}
        {#if t.section}
            <div class="section-label">{t.section}</div>
        {/if}
        <button
            class="tool-btn"
            class:active={gameState.currentTool === t.id}
            class:is-delete={t.id === 'delete'}
            onclick={() => selectTool(t.id)}
            title={t.label}
        >
            <span class="icon">{t.icon}</span>{t.label}
        </button>
    {/each}

    <hr class="divider" />
    <button class="action-btn" onclick={rotateTool}>↻ Rotate [R]</button>
    <button class="action-btn" onclick={clearAll}>⬜ Clear All</button>
    <hr class="divider" />
    <button
        class="action-btn"
        class:sandbox-on={gameState.sandboxMode}
        onclick={() => (gameState.sandboxMode = !gameState.sandboxMode)}
    >
        {gameState.sandboxMode ? '🔓 Sandbox' : '🔒 Strict'}
    </button>
</div>

<style>
    .toolbar {
        width: 130px;
        min-width: 130px;
        background: #16213e;
        border-right: 2px solid #0f3460;
        display: flex;
        flex-direction: column;
        padding: 10px 6px;
        gap: 4px;
        overflow-y: auto;
        flex-shrink: 0;
        box-sizing: border-box;
        font-family: 'Share Tech Mono', 'Courier New', monospace;
    }

    .section-label {
        font-size: 9px;
        color: #4a5568;
        letter-spacing: 2px;
        padding: 6px 4px 2px;
        user-select: none;
    }

    .divider {
        border: none;
        border-top: 1px solid #0f3460;
        margin: 4px 0;
    }

    .tool-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 8px;
        border: 1px solid #0f3460;
        background: transparent;
        color: #c8d6e5;
        font-family: inherit;
        font-size: 11px;
        cursor: pointer;
        border-radius: 3px;
        transition: all 0.15s;
        text-align: left;
        flex-shrink: 0;
    }
    .tool-btn:hover            { border-color: #00ff88; color: #00ff88; background: rgba(0,255,136,.07); }
    .tool-btn.active           { border-color: #00ff88; background: rgba(0,255,136,.13); color: #00ff88; }
    .tool-btn.is-delete:hover  { border-color: #e94560; color: #e94560; background: rgba(233,69,96,.08); }
    .tool-btn.is-delete.active { border-color: #e94560; background: rgba(233,69,96,.15); color: #e94560; }

    .icon { font-size: 15px; width: 20px; text-align: center; flex-shrink: 0; }

    .action-btn {
        padding: 6px 8px;
        border: 1px solid #0f3460;
        background: transparent;
        color: #c8d6e5;
        font-family: inherit;
        font-size: 10px;
        cursor: pointer;
        border-radius: 3px;
        transition: all 0.15s;
        text-align: center;
        flex-shrink: 0;
    }
    .action-btn:hover     { border-color: #ffd700; color: #ffd700; }
    .action-btn.sandbox-on { border-color: #00ff88; color: #00ff88; }
</style>

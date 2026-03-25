<!-- src/routes/circuitry/+page.svelte -->
<script lang="ts">
    import { gameState, selectTool, rotateTool, askAI } from '$lib/circuitry/game.svelte';
    import { uiState } from '$lib/game-ui.svelte';

    import GameShell      from '$lib/components/GameShell.svelte';
    import GoalBanner     from '$lib/components/GoalBanner.svelte';
    import GameControls   from './GameControls.svelte';
    import CircuitryBoard from '$lib/circuitry/CircuitryBoard.svelte';

    // ── AI panel wired to circuitry's askAI ──────────────────────────────────
    async function handleAskAI() {
        if (!uiState.aiPrompt.trim()) return;
        uiState.aiResponse = await askAI(uiState.aiPrompt);
        uiState.aiPrompt   = '';
    }

    // ── Goal: all lights on ───────────────────────────────────────────────────
    $effect(() => {
        if (
            gameState.totalLights > 0 &&
            gameState.activeLights === gameState.totalLights &&
            gameState.solved &&
            !gameState.shortCircuit
        ) {
            uiState.goalReached = true;
        }
    });

    // ── Keyboard shortcuts ────────────────────────────────────────────────────
    function onKey(e: KeyboardEvent) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        if (e.key === 'r' || e.key === 'R')      rotateTool();
        if (e.key === 'Escape')                  gameState.wireStart = null;
        if (e.key === '1')                       selectTool('wire');
        if (e.key === '2')                       selectTool('battery');
        if (e.key === '3')                       selectTool('switch');
        if (e.key === '4')                       selectTool('light');
        if (e.key === 'x' || e.key === 'Delete') selectTool('delete');
    }

    // Hint bar styling
    let hintClass = $derived(
        gameState.shortCircuit ? 'hint error'
        : gameState.solved     ? 'hint success'
        : 'hint'
    );

    let compCount = $derived(Object.keys(gameState.components).length);
    let wireCount = $derived(Object.keys(gameState.wires).length);
    let statusTxt = $derived(
        gameState.shortCircuit             ? '⚠ Short circuit'
        : gameState.solved && gameState.totalLights > 0
            ? `✅ ${gameState.activeLights}/${gameState.totalLights} bulbs lit`
        : gameState.solved                  ? '✅ Complete'
        : '—'
    );
</script>

<svelte:window on:keydown={onKey} />
<svelte:head>
    <link
        href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;700&display=swap"
        rel="stylesheet"
    />
</svelte:head>

<GameShell>
    <!-- ── LEFT: AI panel (replicates AIPanel.svelte, uses circuitry's askAI) ── -->
    {#snippet ai()}
        <img src="/scientists.jpg" alt="Lab Assistant" class="ai-img" />
        <input
            class="ai-input"
            type="text"
            placeholder="Ask the AI for help..."
            bind:value={uiState.aiPrompt}
            onkeydown={(e) => e.key === 'Enter' && handleAskAI()}
        />
        <button class="ai-btn" onclick={handleAskAI}>Ask AI</button>
        <p class="ai-output">{uiState.aiResponse}</p>
    {/snippet}

    <!-- ── RIGHT: experiment panel ─────────────────────────────────────────── -->
    {#snippet experiment()}
        <!-- Header bar -->
        <div class="circuit-header">
            <span class="circuit-title">CIRCUIT LAB</span>
            <span class="mode-badge">SANDBOX</span>
            <span class={hintClass}>{gameState.hint}</span>
        </div>

        <!-- Board: toolbar + canvas -->
        <div class="board-area">
            <GameControls />

            <div class="canvas-wrap">
                <!-- Goal banner overlays the canvas -->
                <GoalBanner />
                <CircuitryBoard />

                <!-- Rotation indicator -->
                <div class="rot-badge">
                    {gameState.rotation === 0 ? '→ Horizontal' : '↓ Vertical'}
                </div>
            </div>
        </div>

        <!-- Status bar -->
        <div class="status-bar">
            <span class="s-item">Tool: <b>{gameState.currentTool}</b></span>
            <span class="s-item">Components: <b>{compCount}</b></span>
            <span class="s-item">Wires: <b>{wireCount}</b></span>
            <span class="s-item">Status: <b>{statusTxt}</b></span>
            {#if gameState.totalLights > 0}
                <span class="s-item bulbs">
                    {#each Array(gameState.totalLights) as _, i}
                        <span class="pip" class:lit={i < gameState.activeLights}>💡</span>
                    {/each}
                </span>
            {/if}
        </div>
    {/snippet}
</GameShell>

<style>
    /* ── AI panel content (inside GameShell's .ai-panel) ── */
    .ai-img {
        width: 100%;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 4px 8px rgba(0,0,0,.3);
    }

    .ai-input {
        width: 100%;
        padding: 8px;
        margin: 6px 0;
        border-radius: 4px;
        border: 1px solid #444;
        background: #22293c;
        color: #fff;
        font-family: 'Share Tech Mono', monospace;
        font-size: 12px;
        box-sizing: border-box;
    }
    .ai-input:focus {
        outline: none;
        border-color: #66ccff;
        box-shadow: 0 0 8px #66ccff;
    }

    .ai-btn {
        width: 100%;
        padding: 8px;
        margin-bottom: 8px;
        border: none;
        border-radius: 4px;
        background: #66ccff;
        color: #0b1020;
        font-weight: bold;
        font-family: 'Share Tech Mono', monospace;
        cursor: pointer;
        transition: all .2s;
    }
    .ai-btn:hover { background: #33aaff; box-shadow: 0 0 12px #33aaff; }

    .ai-output {
        width: 100%;
        background: #111520;
        border: 1px solid #333;
        border-radius: 6px;
        padding: 10px;
        min-height: 60px;
        font-size: 12px;
        font-family: 'Share Tech Mono', monospace;
        overflow-wrap: break-word;
        box-shadow: inset 0 0 8px #000;
        box-sizing: border-box;
    }

    /* ── Experiment panel layout ── */

    /* GameShell's .experiment-panel uses padding:15px;
       We override that padding here so the board can go edge-to-edge */
    :global(.experiment-panel) {
        padding: 0 !important;
        background-color: #0e1520 !important;
        font-family: 'Share Tech Mono', 'Courier New', monospace;
    }

    /* ── Header ── */
    .circuit-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 7px 14px;
        background: #16213e;
        border-bottom: 2px solid #0f3460;
        flex-shrink: 0;
    }

    .circuit-title {
        font-family: 'Orbitron', monospace;
        font-size: 17px;
        font-weight: 700;
        color: #00ff88;
        letter-spacing: 3px;
        white-space: nowrap;
    }

    .mode-badge {
        background: #e94560;
        color: #fff;
        font-size: 9px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 2px;
        letter-spacing: 1.5px;
        white-space: nowrap;
    }

    .hint {
        margin-left: auto;
        font-size: 11px;
        color: #ffd700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 420px;
    }
    .hint.success { color: #00ff88; }
    .hint.error   { color: #e94560; }

    /* ── Board area: toolbar left + canvas right ── */
    .board-area {
        display: flex;
        flex: 1;
        min-height: 0;
        overflow: hidden;
    }

    .canvas-wrap {
        flex: 1;
        position: relative;
        overflow: hidden;
        background: #1a1a2e;
    }

    /* ── Rotation badge ── */
    .rot-badge {
        position: absolute;
        bottom: 10px;
        right: 12px;
        background: #16213e;
        border: 1px solid #0f3460;
        padding: 5px 10px;
        font-size: 11px;
        border-radius: 3px;
        color: #c8d6e5;
        pointer-events: none;
        z-index: 5;
        font-family: 'Share Tech Mono', monospace;
    }

    /* ── Status bar ── */
    .status-bar {
        display: flex;
        align-items: center;
        gap: 18px;
        padding: 4px 14px;
        background: #16213e;
        border-top: 1px solid #0f3460;
        font-size: 10px;
        color: #4a5568;
        flex-shrink: 0;
        font-family: 'Share Tech Mono', monospace;
        overflow: hidden;
    }

    .s-item { white-space: nowrap; }
    .s-item b { color: #c8d6e5; font-weight: normal; }

    .bulbs { display: flex; align-items: center; gap: 3px; }
    .pip { font-size: 12px; opacity: .2; transition: opacity .2s, filter .2s; }
    .pip.lit { opacity: 1; filter: drop-shadow(0 0 4px #ffd700); }
</style>

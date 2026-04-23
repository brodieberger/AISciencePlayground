<!-- $lib/chemistry/ReactionPanel.svelte -->
<!-- Shows selected elements, trigger button, and animated compound result display -->

<script lang="ts">
    import {
        gameState,
        removeFromReaction,
        clearReaction,
        triggerReaction,
        type CompoundResult,
        type PhysicalState,
        type DangerLevel,
    } from './game.svelte';

    const DANGER_COLORS: Record<DangerLevel, string> = {
        safe:     '#4caf50',
        low:      '#8bc34a',
        moderate: '#ffb300',
        high:     '#f44336',
        extreme:  '#9c27b0',
    };

    const STATE_LABELS: Record<PhysicalState, string> = {
        solid:   'Solid',
        liquid:  'Liquid',
        gas:     'Gas',
        plasma:  'Plasma',
        unknown: 'Unknown',
    };

    function dangerLabel(d: DangerLevel): string {
        return d.charAt(0).toUpperCase() + d.slice(1);
    }

    // Particle count by state for the renderer
    const PARTICLE_COUNTS: Record<PhysicalState, number> = {
        solid: 0, liquid: 12, gas: 20, plasma: 25, unknown: 0,
    };
</script>

<div class="reaction-panel">

    <!-- ── Staged slots ── -->
    <div class="stage-section">
        <div class="stage-label">REACTION STAGE</div>

        <div class="stage-slots">
            {#each gameState.selectedSlots as slot}
                <div class="stage-slot" style="--el-color: {slot.element.color};">
                    <span class="stage-symbol">{slot.element.symbol}</span>
                    <span class="stage-qty">×{slot.quantity}</span>
                    <button
                        class="remove-btn"
                        onclick={() => removeFromReaction(slot.element.symbol)}
                        title="Remove one {slot.element.name}"
                    >−</button>
                </div>
            {/each}

            {#if gameState.selectedSlots.length === 0}
                <div class="empty-stage">
                    Select elements from the board →
                </div>
            {/if}
        </div>

        <!-- Controls -->
        <div class="stage-controls">
            <button
                class="react-btn"
                disabled={gameState.selectedSlots.reduce((n, s) => n + s.quantity, 0) < 2 || gameState.reacting}
                onclick={triggerReaction}
            >
                {#if gameState.reacting}
                    <span class="spinner"></span> Reacting…
                {:else}
                    ⚗ React
                {/if}
            </button>
            <button
                class="clear-btn"
                disabled={gameState.selectedSlots.length === 0}
                onclick={clearReaction}
            >
                Clear
            </button>
        </div>

        {#if gameState.error}
            <div class="error-msg">{gameState.error}</div>
        {/if}
    </div>

    <!-- ── Compound result ── -->
    {#if gameState.lastResult}
        {@const r = gameState.lastResult}
        <div class="result-section">

            <!-- Visual renderer -->
            <div
                class="compound-renderer state-{r.physicalState}"
                style="--compound-color: {r.color};"
            >
                <!-- Solid: static crystal-like shape -->
                {#if r.physicalState === 'solid'}
                    <div class="solid-crystal">
                        <div class="crystal-inner"></div>
                    </div>

                <!-- Liquid: animated blob with surface ripple -->
                {:else if r.physicalState === 'liquid'}
                    <div class="liquid-container">
                        <div class="liquid-body">
                            <div class="liquid-surface"></div>
                            {#each Array(PARTICLE_COUNTS.liquid) as _, i}
                                <div
                                    class="liquid-bubble"
                                    style="
                                        left: {10 + Math.random() * 80}%;
                                        animation-delay: {Math.random() * 3}s;
                                        animation-duration: {1.5 + Math.random() * 2}s;
                                        width: {4 + Math.random() * 6}px;
                                        height: {4 + Math.random() * 6}px;
                                    "
                                ></div>
                            {/each}
                        </div>
                    </div>

                <!-- Gas: floating particles -->
                {:else if r.physicalState === 'gas'}
                    <div class="gas-container">
                        {#each Array(PARTICLE_COUNTS.gas) as _, i}
                            <div
                                class="gas-particle"
                                style="
                                    left: {Math.random() * 90}%;
                                    top: {Math.random() * 90}%;
                                    animation-delay: {Math.random() * 4}s;
                                    animation-duration: {2 + Math.random() * 3}s;
                                    width: {3 + Math.random() * 5}px;
                                    height: {3 + Math.random() * 5}px;
                                    opacity: {0.4 + Math.random() * 0.5};
                                    --rand: {Math.random()};
                                    --rand2: {Math.random()};
                                "
                            ></div>
                        {/each}
                    </div>

                <!-- Plasma: electric arcing effect -->
                {:else if r.physicalState === 'plasma'}
                    <div class="plasma-container">
                        {#each Array(PARTICLE_COUNTS.plasma) as _, i}
                            <div
                                class="plasma-arc"
                                style="
                                    left: {Math.random() * 90}%;
                                    top: {Math.random() * 90}%;
                                    animation-delay: {Math.random() * 2}s;
                                    width: {2 + Math.random() * 4}px;
                                    height: {2 + Math.random() * 4}px;
                                "
                            ></div>
                        {/each}
                    </div>

                {:else}
                    <div class="unknown-state">?</div>
                {/if}

                <!-- Formula overlay -->
                <div class="formula-overlay">{r.formula}</div>
            </div>

            <!-- Info card -->
            <div class="result-info">
                <div class="result-header">
                    <span class="result-formula">{r.formula}</span>
                    <span class="result-name">{r.commonName}</span>
                </div>

                <div class="result-badges">
                    <span class="badge state-badge">{STATE_LABELS[r.physicalState]}</span>
                    <span
                        class="badge danger-badge"
                        style="--danger-color: {DANGER_COLORS[r.dangerLevel]};"
                    >{dangerLabel(r.dangerLevel)} hazard</span>
                    <span class="badge stability-badge">{r.stability}</span>
                </div>

                <p class="result-reaction">{r.reactionDescription}</p>
                <p class="result-uses"><strong>Uses:</strong> {r.uses}</p>
            </div>
        </div>
    {/if}

</div>

<style>
    .reaction-panel {
        display: flex;
        flex-direction: column;
        gap: 10px;
        height: 100%;
        overflow-y: auto;
        padding: 10px;
        box-sizing: border-box;
    }

    /* ── Section labels ── */
    .stage-label {
        font-size: 0.6rem;
        letter-spacing: 0.15em;
        color: #3a6a8a;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
    }
    .cache-badge {
        background: #1a3a1a;
        border: 1px solid #2a6a2a;
        color: #4caf50;
        border-radius: 10px;
        padding: 1px 6px;
        font-size: 0.55rem;
        letter-spacing: 0.05em;
    }

    /* ── Stage slots ── */
    .stage-section { display: flex; flex-direction: column; gap: 6px; }

    .stage-slots {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        min-height: 52px;
        align-items: flex-start;
        background: #070f1a;
        border: 1px solid #1a2a3a;
        border-radius: 6px;
        padding: 8px;
    }

    .stage-slot {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1px;
        background: color-mix(in srgb, var(--el-color) 15%, #0d1828);
        border: 1.5px solid var(--el-color);
        border-radius: 6px;
        padding: 6px 10px 4px;
        min-width: 48px;
        animation: pop-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes pop-in {
        from { transform: scale(0.7); opacity: 0; }
        to   { transform: scale(1);   opacity: 1; }
    }
    .stage-symbol {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--el-color);
    }
    .stage-qty {
        font-size: 0.6rem;
        color: color-mix(in srgb, var(--el-color) 70%, white);
    }
    .remove-btn {
        position: absolute;
        top: -6px; right: -6px;
        width: 16px; height: 16px;
        border-radius: 50%;
        background: #1a0a0a;
        border: 1px solid #f44336;
        color: #f44336;
        font-size: 0.7rem;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        line-height: 1;
        padding: 0;
        transition: background 0.15s;
    }
    .remove-btn:hover { background: #f44336; color: white; }

    .empty-stage {
        font-size: 0.72rem;
        color: #2a4a6a;
        font-style: italic;
        padding: 4px;
    }

    /* ── Stage controls ── */
    .stage-controls { display: flex; gap: 6px; }

    .react-btn {
        flex: 1;
        padding: 8px 12px;
        background: #0a2040;
        border: 1.5px solid #3a8aee;
        border-radius: 5px;
        color: #3a8aee;
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-family: inherit;
    }
    .react-btn:hover:not(:disabled) {
        background: #3a8aee;
        color: #0a0f1a;
        box-shadow: 0 0 16px #3a8aee60;
    }
    .react-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .clear-btn {
        padding: 8px 12px;
        background: #1a0a0a;
        border: 1.5px solid #3a1a1a;
        border-radius: 5px;
        color: #6a3a3a;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.15s;
        font-family: inherit;
    }
    .clear-btn:hover:not(:disabled) { border-color: #f44336; color: #f44336; }
    .clear-btn:disabled { opacity: 0.3; cursor: not-allowed; }

    .error-msg {
        font-size: 0.75rem;
        color: #f44336;
        padding: 4px 8px;
        background: #1f0a0a;
        border-radius: 4px;
        border-left: 3px solid #f44336;
    }

    /* ── Spinner ── */
    .spinner {
        width: 12px; height: 12px;
        border: 2px solid #3a8aee40;
        border-top-color: #3a8aee;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
        display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Result section ── */
    .result-section { display: flex; flex-direction: column; gap: 8px; }

    /* ── Compound renderer ── */
    .compound-renderer {
        position: relative;
        height: 110px;
        background: #070f1a;
        border: 1px solid color-mix(in srgb, var(--compound-color) 40%, #1a2a3a);
        border-radius: 8px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .formula-overlay {
        position: absolute;
        bottom: 6px;
        right: 8px;
        font-size: 0.7rem;
        font-weight: 700;
        color: color-mix(in srgb, var(--compound-color) 80%, white);
        opacity: 0.6;
        letter-spacing: 0.05em;
        pointer-events: none;
    }

    /* Solid */
    .solid-crystal {
        width: 52px; height: 52px;
        background: color-mix(in srgb, var(--compound-color) 30%, #0a0f1a);
        border: 2px solid var(--compound-color);
        border-radius: 4px;
        transform: rotate(15deg);
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 0 20px color-mix(in srgb, var(--compound-color) 30%, transparent);
    }
    .crystal-inner {
        width: 28px; height: 28px;
        background: color-mix(in srgb, var(--compound-color) 50%, transparent);
        border: 1px solid color-mix(in srgb, var(--compound-color) 60%, white);
        border-radius: 2px;
        transform: rotate(30deg);
    }

    /* Liquid */
    .liquid-container {
        width: 100%; height: 100%;
        display: flex; align-items: flex-end;
    }
    .liquid-body {
        position: relative;
        width: 100%;
        height: 65%;
        background: color-mix(in srgb, var(--compound-color) 40%, transparent);
        overflow: hidden;
    }
    .liquid-surface {
        position: absolute;
        top: 0; left: -10%; right: -10%;
        height: 8px;
        background: color-mix(in srgb, var(--compound-color) 70%, white);
        border-radius: 50%;
        animation: wave 2.5s ease-in-out infinite;
    }
    @keyframes wave {
        0%,100% { transform: translateX(0) scaleY(1); }
        50%      { transform: translateX(5%) scaleY(1.3); }
    }
    .liquid-bubble {
        position: absolute;
        border-radius: 50%;
        background: color-mix(in srgb, var(--compound-color) 60%, white);
        bottom: 0;
        animation: bubble-rise linear infinite;
        opacity: 0.7;
    }
    @keyframes bubble-rise {
        from { transform: translateY(0); opacity: 0.7; }
        to   { transform: translateY(-80px); opacity: 0; }
    }

    /* Gas */
    .gas-container {
        position: relative;
        width: 100%; height: 100%;
        background: radial-gradient(ellipse at center,
            color-mix(in srgb, var(--compound-color) 15%, transparent) 0%,
            transparent 70%);
    }
    .gas-particle {
        position: absolute;
        border-radius: 50%;
        background: var(--compound-color);
        animation: float-gas ease-in-out infinite alternate;
    }
    @keyframes float-gas {
        from { transform: translate(0, 0) scale(1); }
        to   { transform: translate(calc((var(--rand, 0.5) - 0.5) * 40px), calc((var(--rand2, 0.5) - 0.5) * 30px)) scale(0.6); }
    }

    /* Plasma */
    .plasma-container {
        position: relative;
        width: 100%; height: 100%;
        background: radial-gradient(ellipse at center,
            color-mix(in srgb, var(--compound-color) 25%, transparent) 0%,
            transparent 65%);
    }
    .plasma-arc {
        position: absolute;
        border-radius: 50%;
        background: var(--compound-color);
        box-shadow: 0 0 8px var(--compound-color), 0 0 16px var(--compound-color);
        animation: plasma-pulse 0.3s ease-in-out infinite alternate;
    }
    @keyframes plasma-pulse {
        from { transform: scale(1); opacity: 1; }
        to   { transform: scale(2.5); opacity: 0.2; }
    }

    /* Unknown */
    .unknown-state {
        font-size: 2.5rem;
        color: #2a4a6a;
        font-weight: 700;
    }

    /* ── Result info card ── */
    .result-info {
        background: #0d1828;
        border: 1px solid #1a2a3a;
        border-radius: 6px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .result-header {
        display: flex;
        align-items: baseline;
        gap: 8px;
    }
    .result-formula {
        font-size: 1.1rem;
        font-weight: 700;
        color: color-mix(in srgb, var(--compound-color, #80cbc4) 90%, white);
    }
    .result-name {
        font-size: 0.8rem;
        color: #7a9ab8;
    }

    .result-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
    }
    .badge {
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 0.65rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        border: 1px solid;
    }
    .state-badge {
        background: #0a1828;
        border-color: #2a5a8a;
        color: #5a9abb;
    }
    .danger-badge {
        background: color-mix(in srgb, var(--danger-color) 15%, #0a0f1a);
        border-color: var(--danger-color);
        color: var(--danger-color);
    }
    .stability-badge {
        background: #0a1a0a;
        border-color: #2a4a2a;
        color: #5a8a5a;
    }

    .result-reaction {
        font-size: 0.73rem;
        color: #7a9ab8;
        line-height: 1.5;
        margin: 0;
        font-style: italic;
        border-left: 2px solid #1a3a5a;
        padding-left: 8px;
    }
    .result-uses {
        font-size: 0.73rem;
        color: #6a8a9a;
        line-height: 1.5;
        margin: 0;
    }
    .result-uses strong { color: #8aaabb; font-weight: 600; }
</style>

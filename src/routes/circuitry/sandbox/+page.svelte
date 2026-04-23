<!-- src/routes/circuitry/sandbox/+page.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { startSandbox } from '$lib/circuitry/game.svelte';

    import GameShell      from '$lib/components/GameShell.svelte';
    import AIPanel        from '$lib/components/AIPanel.svelte';
    import CircuitryBoard from '$lib/circuitry/CircuitryBoard.svelte';
    import SandboxControls from '../SandboxControls.svelte';
    import type { ComponentType } from '$lib/circuitry/game.svelte';

    let selected: ComponentType = $state('wire');

    onMount(() => {
        startSandbox(document.body);
    });
</script>

<GameShell>
    {#snippet ai()}
        <h2>Lab Assistant</h2>
        <AIPanel />
    {/snippet}

    {#snippet experiment()}
        <div class="game-container">
            <CircuitryBoard bind:selected />
        </div>

        <div class="controls-bar">
            <SandboxControls bind:selected />
        </div>
    {/snippet}
</GameShell>

<style>
    :global(.experiment-panel) {
        padding: 0 !important;
        overflow: hidden !important;
    }

    .game-container {
        flex: 1 1 0;
        min-height: 0;
        width: 100%;
        background: #07111f;
        position: relative;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
        container-type: size;
    }

    .controls-bar {
        flex-shrink: 0;
        width: 100%;
        overflow-x: auto;
    }
</style>

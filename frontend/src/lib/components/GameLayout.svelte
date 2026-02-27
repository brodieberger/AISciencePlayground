<script lang="ts">
	type Props = {
		title?: () => any;
		controls?: () => any;
		ai?: () => any;
		status?: () => any;
		children?: () => any;
	};

	let {
		title,
		controls,
		ai,
		status,
		children
	}: Props = $props();
</script>

{#if title}
	<h2>{@render title()}</h2>
{/if}

{#if controls}
	<div class="ui">
		{@render controls()}
	</div>
{/if}

{#if ai}
	<div class="ai-panel">
		{@render ai()}
	</div>
{/if}

{#if status}
	{@render status()}
{/if}

{@render children?.()}

<style>
	.ui {
		display: flex;
		gap: 8px;
		margin-bottom: 8px;
	}

	.ai-panel {
		margin: 8px 0;
		display: flex;
		gap: 8px;
		align-items: center;
	}
</style>
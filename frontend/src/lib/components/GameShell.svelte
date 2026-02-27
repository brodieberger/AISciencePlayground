<script lang="ts">
	type Props = {
		ai?: () => any;
		experiment?: () => any;
	};

	let { ai, experiment }: Props = $props();
</script>

<div class="container">
	<div class="ai-panel">
		{@render ai?.()}
	</div>

	<div class="experiment-panel">
		{@render experiment?.()}
	</div>
</div>

<style>
:global(html, body) {
	margin: 0;
	padding: 0;
	height: 100%;
	font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
	background-color: #0b1020;
	color: #e0e0e0;
}

.container {
	display: flex;
	height: 100vh;
	width: 100vw;
	overflow: hidden;
}

.ai-panel {
	width: 25%;
	background-color: #1b1f2b;
	border-right: 2px solid #333;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 20px;
	box-sizing: border-box;
}

.experiment-panel {
	flex: 1;
	position: relative;
	background-color: #101420;
	display: flex;
	flex-direction: column;
	align-items: stretch;  
	padding: 15px;
	box-sizing: border-box;
}

</style>
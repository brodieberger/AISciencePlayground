<script>
	import { goto } from '$app/navigation';

	function startPhysics() {
		goto('/physics');
	}
</script>

<h1>AI Science Playground</h1>

<button on:click={startPhysics}>
	Start Physics Sandbox
</button>

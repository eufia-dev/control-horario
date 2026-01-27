<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	onMount(() => {
		goto(resolve('/costs/mensual/projects'), { replaceState: true });
	});
</script>

<!-- This page redirects to the projects tab -->

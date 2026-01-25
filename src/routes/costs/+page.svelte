<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	onMount(() => {
		goto(resolve('/costs/anual'), { replaceState: true });
	});
</script>

<!-- This page redirects to the anual tab -->

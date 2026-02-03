<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { hasProjectsFeature } from '$lib/stores/auth';

	onMount(() => {
		const nextPath = $hasProjectsFeature ? '/analytics/projects' : '/analytics/users';
		goto(resolve(nextPath), { replaceState: true });
	});
</script>

<!-- This page redirects to the appropriate tab -->

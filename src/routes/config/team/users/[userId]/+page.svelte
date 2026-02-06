<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';

	let userId = $derived($page.params.userId);

	onMount(() => {
		goto(resolve(`/config/team/users/${userId}/history`), { replaceState: true });
	});
</script>

<!-- This page redirects to the history tab -->

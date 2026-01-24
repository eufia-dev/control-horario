<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { isAdmin as isAdminStore } from '$lib/stores/auth';

	let isAdmin = $state(false);

	$effect(() => {
		const unsub = isAdminStore.subscribe((value) => {
			isAdmin = value;
		});
		return unsub;
	});

	onMount(() => {
		if (isAdmin) {
			goto(resolve('/config/company'), { replaceState: true });
		} else {
			goto(resolve('/config/team'), { replaceState: true });
		}
	});
</script>

<!-- This page redirects to the appropriate tab -->

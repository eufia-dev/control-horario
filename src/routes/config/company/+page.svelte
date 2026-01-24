<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { isAdmin as isAdminStore } from '$lib/stores/auth';
	import SchedulesSection from './SchedulesSection.svelte';
	import HolidaysSection from '../absences/HolidaysSection.svelte';
	import LocationSection from './LocationSection.svelte';

	let isAdmin = $state(false);

	$effect(() => {
		const unsub = isAdminStore.subscribe((value) => {
			isAdmin = value;
		});
		return unsub;
	});

	onMount(() => {
		if (!isAdmin) {
			goto(resolve('/config/team'), { replaceState: true });
		}
	});
</script>

{#if isAdmin}
	<SchedulesSection />
	<HolidaysSection />
	<LocationSection />
{/if}

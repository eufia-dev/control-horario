<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth, isAdmin as isAdminStore } from '$lib/stores/auth';
	import ProjectsSection from './ProjectsSection.svelte';
	import UsersSection from './UsersSection.svelte';
	import ExternalsSection from './ExternalsSection.svelte';
	import InvitationsSection from './InvitationsSection.svelte';
	import JoinRequestsSection from './JoinRequestsSection.svelte';

	let isAdmin = $state(false);
	$effect(() => {
		const unsub = isAdminStore.subscribe((value) => {
			isAdmin = value;
		});
		return unsub;
	});

	onMount(() => {
		const role = $auth.user?.role;
		if (role !== 'OWNER' && role !== 'ADMIN') {
			goto('/');
			return;
		}
	});

	$effect(() => {
		const role = $auth.user?.role;
		if (!$auth.isInitializing && role !== 'OWNER' && role !== 'ADMIN') {
			goto('/');
		}
	});
</script>

{#if isAdmin}
	<div class="grow flex flex-col gap-6 p-6">
		<ProjectsSection />
		<UsersSection />
		<InvitationsSection />
		<JoinRequestsSection />
		<ExternalsSection />
	</div>
{/if}

<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { isAdmin as isAdminStore, isTeamLeader as isTeamLeaderStore } from '$lib/stores/auth';
	import TeamsSection from './TeamsSection.svelte';
	import UsersSection from './UsersSection.svelte';
	import InvitationsSection from './InvitationsSection.svelte';
	import JoinRequestsSection from './JoinRequestsSection.svelte';
	import TeamSchedulesSection from './TeamSchedulesSection.svelte';

	let isAdmin = $state(false);
	let isTeamLeader = $state(false);
	let teamsSectionRef = $state<{ loadTeams: () => Promise<void> } | null>(null);
	let usersSectionRef = $state<{ loadUsers: () => Promise<void> } | null>(null);
	let joinRequestsSectionEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		const unsub = isAdminStore.subscribe((value) => {
			isAdmin = value;
		});
		return unsub;
	});

	$effect(() => {
		const unsub = isTeamLeaderStore.subscribe((value) => {
			isTeamLeader = value;
		});
		return unsub;
	});

	function handleUserUpdated() {
		if (isAdmin && teamsSectionRef) {
			teamsSectionRef.loadTeams();
		}
	}

	function handleJoinRequestsChange() {
		// Refresh users list since approved requests create new users
		usersSectionRef?.loadUsers();
	}

	// Handle scroll to join requests section via URL hash
	onMount(() => {
		if ($page.url.hash === '#join-requests') {
			setTimeout(() => {
				joinRequestsSectionEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}, 100);
		}
	});
</script>

{#if isAdmin}
	<TeamsSection bind:this={teamsSectionRef} />
{/if}
<UsersSection bind:this={usersSectionRef} onUserUpdated={handleUserUpdated} />
{#if isTeamLeader && !isAdmin}
	<TeamSchedulesSection />
{/if}
{#if isAdmin}
	<InvitationsSection />
	<div bind:this={joinRequestsSectionEl} id="join-requests">
		<JoinRequestsSection onRequestsChange={handleJoinRequestsChange} />
	</div>
{/if}

<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import {
		isAdmin as isAdminStore,
		canAccessAdmin as canAccessAdminStore,
		isTeamLeader as isTeamLeaderStore
	} from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import ProjectsSection from './ProjectsSection.svelte';
	import UsersSection from './UsersSection.svelte';
	import ExternalsSection from './ExternalsSection.svelte';
	import InvitationsSection from './InvitationsSection.svelte';
	import JoinRequestsSection from './JoinRequestsSection.svelte';
	import LocationSection from './LocationSection.svelte';
	import HolidaysSection from './HolidaysSection.svelte';
	import SchedulesSection from './SchedulesSection.svelte';
	import AbsencesSection from './AbsencesSection.svelte';
	import TeamsSection from './TeamsSection.svelte';
	import TeamSchedulesSection from './TeamSchedulesSection.svelte';

	let isAdmin = $state(false);
	let canAccessAdmin = $state(false);
	let isTeamLeader = $state(false);

	$effect(() => {
		const unsub = isAdminStore.subscribe((value) => {
			isAdmin = value;
		});
		return unsub;
	});

	$effect(() => {
		const unsub = canAccessAdminStore.subscribe((value) => {
			canAccessAdmin = value;
		});
		return unsub;
	});

	$effect(() => {
		const unsub = isTeamLeaderStore.subscribe((value) => {
			isTeamLeader = value;
		});
		return unsub;
	});

	type TabValue = 'empresa' | 'equipo' | 'proyectos' | 'ausencias';
	const validTabs: TabValue[] = ['empresa', 'equipo', 'proyectos', 'ausencias'];
	const teamLeaderValidTabs: TabValue[] = ['equipo', 'proyectos', 'ausencias'];

	let activeTab = $state<TabValue>('empresa');
	let teamsSectionRef = $state<{ loadTeams: () => Promise<void> } | null>(null);

	function handleUserUpdated() {
		if (isAdmin && teamsSectionRef) {
			teamsSectionRef.loadTeams();
		}
	}

	// Read tab from URL query parameter on mount
	onMount(() => {
		const tabParam = $page.url.searchParams.get('tab');
		const availableTabs = isAdmin ? validTabs : teamLeaderValidTabs;
		if (tabParam && availableTabs.includes(tabParam as TabValue)) {
			activeTab = tabParam as TabValue;
		} else if (!isAdmin) {
			// Default to 'equipo' tab for team leaders
			activeTab = 'equipo';
		}
	});

	// Update URL when tab changes
	$effect(() => {
		const currentTab = $page.url.searchParams.get('tab');
		if (activeTab && activeTab !== currentTab) {
			const url = new URL($page.url);
			url.searchParams.set('tab', activeTab);
			goto(url.toString(), { replaceState: true, noScroll: true });
		}
	});
</script>

{#if canAccessAdmin}
	<div class="grow flex flex-col gap-6 p-6">
		<div class="flex items-center gap-2">
			<Button variant="ghost" size="sm" onclick={() => goto(resolve('/'))}>
				<span class="material-symbols-rounded text-lg!">arrow_back</span>
			</Button>
			<span class="material-symbols-rounded text-3xl!">settings</span>
			<h1 class="text-2xl font-semibold tracking-tight">Configuración</h1>
		</div>

		<Tabs bind:value={activeTab} class="w-full max-w-6xl mx-auto">
			<div class="mb-4 overflow-x-auto">
				<TabsList class="w-fit">
					{#if isAdmin}
						<TabsTrigger value="empresa" class="gap-1.5">
							<span class="material-symbols-rounded text-lg!">business</span>
							<span>Empresa</span>
						</TabsTrigger>
					{/if}
					<TabsTrigger value="equipo" class="gap-1.5">
						<span class="material-symbols-rounded text-lg!">group</span>
						<span>Equipo</span>
					</TabsTrigger>
					<TabsTrigger value="proyectos" class="gap-1.5">
						<span class="material-symbols-rounded text-lg!">work</span>
						<span>Proyectos</span>
					</TabsTrigger>
					<TabsTrigger value="ausencias" class="gap-1.5">
						<span class="material-symbols-rounded text-lg!">event_available</span>
						<span>Ausencias</span>
					</TabsTrigger>
				</TabsList>
			</div>

			{#if isAdmin}
				<TabsContent value="empresa" class="flex flex-col gap-6">
					<SchedulesSection />
					<HolidaysSection />
					<LocationSection />
				</TabsContent>
			{/if}

			<TabsContent value="equipo" class="flex flex-col gap-6">
				{#if isAdmin}
					<TeamsSection bind:this={teamsSectionRef} />
				{/if}
				<UsersSection onUserUpdated={handleUserUpdated} />
				{#if isTeamLeader && !isAdmin}
					<TeamSchedulesSection />
				{/if}
				{#if isAdmin}
					<InvitationsSection />
					<JoinRequestsSection />
				{/if}
			</TabsContent>

			<TabsContent value="proyectos" class="flex flex-col gap-6">
				<ProjectsSection />
				{#if isAdmin}
					<ExternalsSection />
				{/if}
			</TabsContent>

			<TabsContent value="ausencias" class="flex flex-col gap-6">
				<AbsencesSection />
			</TabsContent>
		</Tabs>
	</div>
{/if}

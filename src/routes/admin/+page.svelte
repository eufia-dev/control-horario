<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { auth, isAdmin as isAdminStore } from '$lib/stores/auth';
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

	let isAdmin = $state(false);

	$effect(() => {
		const unsub = isAdminStore.subscribe((value) => {
			isAdmin = value;
		});
		return unsub;
	});

	type TabValue = 'empresa' | 'equipo' | 'proyectos' | 'ausencias';
	const validTabs: TabValue[] = ['empresa', 'equipo', 'proyectos', 'ausencias'];

	let activeTab = $state<TabValue>('empresa');

	// Read tab from URL query parameter on mount
	onMount(() => {
		const role = $auth.user?.role;
		if (role !== 'OWNER' && role !== 'ADMIN') {
			goto(resolve('/'));
			return;
		}

		const tabParam = $page.url.searchParams.get('tab');
		if (tabParam && validTabs.includes(tabParam as TabValue)) {
			activeTab = tabParam as TabValue;
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

	$effect(() => {
		const role = $auth.user?.role;
		if (!$auth.isInitializing && role !== 'OWNER' && role !== 'ADMIN') {
			goto(resolve('/'));
		}
	});
</script>

{#if isAdmin}
	<div class="grow flex flex-col gap-6 p-6">
		<div class="flex items-center gap-2">
			<Button variant="ghost" size="sm" onclick={() => goto(resolve('/'))}>
				<span class="material-symbols-rounded text-lg!">arrow_back</span>
			</Button>
			<span class="material-symbols-rounded text-3xl!">settings</span>
			<h1 class="text-2xl font-semibold tracking-tight">Configuración</h1>
		</div>

		<Tabs bind:value={activeTab} class="w-full">
			<div class="mb-4 overflow-x-auto">
				<TabsList class="w-fit">
					<TabsTrigger value="empresa" class="gap-1.5">
						<span class="material-symbols-rounded text-lg!">business</span>
						<span>Empresa</span>
					</TabsTrigger>
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

			<TabsContent value="empresa" class="flex flex-col gap-6">
				<SchedulesSection />
				<HolidaysSection />
				<LocationSection />
			</TabsContent>

			<TabsContent value="equipo" class="flex flex-col gap-6">
				<UsersSection />
				<InvitationsSection />
				<JoinRequestsSection />
			</TabsContent>

			<TabsContent value="proyectos" class="flex flex-col gap-6">
				<ProjectsSection />
				<ExternalsSection />
			</TabsContent>

			<TabsContent value="ausencias" class="flex flex-col gap-6">
				<AbsencesSection />
			</TabsContent>
		</Tabs>
	</div>
{/if}

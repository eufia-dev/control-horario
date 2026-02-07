<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import {
		isAdmin as isAdminStore,
		canAccessAdmin as canAccessAdminStore,
		isTeamLeader as isTeamLeaderStore,
		hasCostsFeature as hasCostsFeatureStore
	} from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import PendingAbsencesWidget from '$lib/components/PendingAbsencesWidget.svelte';
	import PendingJoinRequestsWidget from '$lib/components/PendingJoinRequestsWidget.svelte';
	import { fetchAbsenceStats, type AbsenceStats } from '$lib/api/absences';
	import { fetchJoinRequests, type AdminJoinRequest } from '$lib/api/invitations';

	let { children } = $props();

	let isAdmin = $state(false);
	let canAccessAdmin = $state(false);
	let isTeamLeader = $state(false);
	let hasCostsFeature = $state(false);

	let absenceStats = $state<AbsenceStats | null>(null);
	let joinRequests = $state<AdminJoinRequest[]>([]);
	let loadingAbsenceStats = $state(true);
	let loadingJoinRequests = $state(true);

	const pendingJoinRequestsCount = $derived(
		joinRequests.filter((r) => r.status === 'PENDING').length
	);

	async function loadAbsenceStats() {
		if (!isAdmin && !isTeamLeader) return;
		loadingAbsenceStats = true;
		try {
			absenceStats = await fetchAbsenceStats();
		} catch (e) {
			console.error('Error loading absence stats:', e);
		} finally {
			loadingAbsenceStats = false;
		}
	}

	async function loadJoinRequests() {
		if (!isAdmin) return;
		loadingJoinRequests = true;
		try {
			joinRequests = await fetchJoinRequests();
		} catch (e) {
			console.error('Error loading join requests:', e);
		} finally {
			loadingJoinRequests = false;
		}
	}

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

	$effect(() => {
		const unsub = hasCostsFeatureStore.subscribe((value) => {
			hasCostsFeature = value;
		});
		return unsub;
	});

	onMount(() => {
		loadAbsenceStats();
		loadJoinRequests();
	});

	type TabValue = 'company' | 'team' | 'absences' | 'projects' | 'providers';

	const tabs: {
		value: TabValue;
		label: string;
		icon: string;
		adminOnly: boolean;
		costsOnly: boolean;
	}[] = [
		{ value: 'company', label: 'Empresa', icon: 'business', adminOnly: true, costsOnly: false },
		{ value: 'team', label: 'Equipo', icon: 'group', adminOnly: false, costsOnly: false },
		{
			value: 'absences',
			label: 'Ausencias',
			icon: 'event_available',
			adminOnly: false,
			costsOnly: false
		},
		{ value: 'projects', label: 'Proyectos', icon: 'work', adminOnly: false, costsOnly: false },
		{
			value: 'providers',
			label: 'Proveedores',
			icon: 'business_center',
			adminOnly: false,
			costsOnly: true
		}
	];

	const visibleTabs = $derived(
		tabs.filter((tab) => {
			if (tab.adminOnly && !isAdmin) return false;
			if (tab.costsOnly && !hasCostsFeature) return false;
			return true;
		})
	);

	function isActiveTab(tabValue: TabValue): boolean {
		const currentPath = $page.url.pathname;
		return currentPath.startsWith(`/config/${tabValue}`);
	}

	function scrollToJoinRequests() {
		// Navigate to equipo page with hash to scroll to join requests
		goto(`${resolve('/config/team')}#join-requests`);
	}
</script>

{#if canAccessAdmin}
	<div class="grow flex flex-col gap-6 p-6">
		<!-- Header with title and inline tabs on lg -->
		<div
			class="flex flex-col gap-4 lg:relative lg:flex-row lg:items-center lg:justify-center lg:gap-0"
		>
			<div class="flex items-center gap-2 lg:absolute lg:left-0">
				<Button variant="ghost" size="sm" onclick={() => goto(resolve('/'))}>
					<span class="material-symbols-rounded text-lg!">arrow_back</span>
				</Button>
				<span class="material-symbols-rounded text-3xl!">settings</span>
				<h1 class="text-2xl font-semibold tracking-tight">Configuración</h1>
			</div>
			<div class="overflow-x-auto">
				<nav
					class="bg-muted text-muted-foreground inline-flex w-fit items-center justify-center rounded-lg p-[3px]"
				>
					{#each visibleTabs as tab (tab.value)}
						<a
							href={resolve(`/config/${tab.value}`)}
							data-state={isActiveTab(tab.value) ? 'active' : 'inactive'}
							class="data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2 py-1 text-sm font-medium transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] data-[state=active]:shadow-sm"
						>
							<span class="material-symbols-rounded text-lg!">{tab.icon}</span>
							<span>{tab.label}</span>
						</a>
					{/each}
				</nav>
			</div>
		</div>

		{#if (isAdmin || isTeamLeader) && (absenceStats?.pending ?? 0) > 0}
			<div class="w-full max-w-6xl 2xl:max-w-7xl mx-auto">
				<PendingAbsencesWidget
					pendingCount={absenceStats?.pending ?? 0}
					loading={loadingAbsenceStats}
				/>
			</div>
		{/if}

		{#if isAdmin && pendingJoinRequestsCount > 0}
			<div class="w-full max-w-6xl 2xl:max-w-7xl mx-auto">
				<PendingJoinRequestsWidget
					pendingCount={pendingJoinRequestsCount}
					loading={loadingJoinRequests}
					onScrollToSection={scrollToJoinRequests}
				/>
			</div>
		{/if}

		<div class="w-full max-w-6xl 2xl:max-w-7xl mx-auto">
			<div class="flex flex-col gap-6">
				{@render children()}
			</div>
		</div>
	</div>
{/if}

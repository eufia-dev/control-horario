<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { auth } from '$lib/stores/auth';
	import ProjectsChart from '$lib/components/charts/projects-chart.svelte';
	import WorkersChart from '$lib/components/charts/workers-chart.svelte';
	import PayrollSummary from './PayrollSummary.svelte';
	import {
		fetchProjectsSummary,
		fetchWorkersSummary,
		formatCost,
		type ProjectSummary,
		type WorkerSummary
	} from '$lib/api/analytics';

	const currentUserId = $derived($auth.user?.id ?? null);

	let projects = $state<ProjectSummary[]>([]);
	let workers = $state<WorkerSummary[]>([]);

	let loadingProjects = $state(true);
	let loadingWorkers = $state(true);

	let projectsError = $state<string | null>(null);
	let workersError = $state<string | null>(null);

	const totalHours = $derived(projects.reduce((sum, p) => sum + p.totalMinutes, 0) / 60);
	const totalCost = $derived(projects.reduce((sum, p) => sum + p.totalCost, 0));
	const activeProjectsCount = $derived(projects.length);
	const totalWorkersCount = $derived(workers.length);

	async function loadProjects() {
		loadingProjects = true;
		projectsError = null;
		try {
			const response = await fetchProjectsSummary();
			projects = response.projects ?? [];
		} catch (e) {
			projectsError = e instanceof Error ? e.message : 'Error al cargar proyectos';
		} finally {
			loadingProjects = false;
		}
	}

	async function loadWorkers() {
		loadingWorkers = true;
		workersError = null;
		try {
			const response = await fetchWorkersSummary();
			workers = response.workers ?? [];
		} catch (e) {
			workersError = e instanceof Error ? e.message : 'Error al cargar trabajadores';
		} finally {
			loadingWorkers = false;
		}
	}

	type TabValue = 'proyectos' | 'nominas';
	const validTabs: TabValue[] = ['proyectos', 'nominas'];

	let activeTab = $state<TabValue>('proyectos');

	// Read tab from URL query parameter on mount
	onMount(() => {
		const tabParam = $page.url.searchParams.get('tab');
		if (tabParam && validTabs.includes(tabParam as TabValue)) {
			activeTab = tabParam as TabValue;
		}
		loadProjects();
		loadWorkers();
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

<div class="container mx-auto px-4 py-8">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-center gap-2">
			<Button variant="ghost" size="sm" onclick={() => goto(resolve('/'))}>
				<span class="material-symbols-rounded text-lg!">arrow_back</span>
			</Button>
			<h1 class="text-2xl font-semibold tracking-tight flex items-center gap-2">
				<span class="material-symbols-rounded text-3xl!">analytics</span>
				Analíticas
			</h1>
		</div>
		<p class="text-muted-foreground mt-1">Dashboard con métricas y gráficos de proyectos</p>
	</div>

	<Tabs bind:value={activeTab} class="w-full">
		<div class="mb-6 overflow-x-auto">
			<TabsList class="w-fit">
				<TabsTrigger value="proyectos" class="gap-1.5">
					<span class="material-symbols-rounded text-lg!">work</span>
					<span>Proyectos</span>
				</TabsTrigger>
				<TabsTrigger value="nominas" class="gap-1.5">
					<span class="material-symbols-rounded text-lg!">payments</span>
					<span>Nóminas</span>
				</TabsTrigger>
			</TabsList>
		</div>

	<TabsContent value="proyectos" class="flex flex-col gap-6">
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<Card class="gap-2">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium text-muted-foreground">Horas Totales</CardTitle>
					<span class="material-symbols-rounded text-xl! text-muted-foreground">schedule</span>
				</CardHeader>
				<CardContent>
					{#if loadingProjects}
						<Skeleton class="h-8 w-24" />
					{:else}
						<div class="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
						<p class="text-xs text-muted-foreground mt-1">
							en {activeProjectsCount} proyectos activos
						</p>
					{/if}
				</CardContent>
			</Card>

			<Card class="gap-2">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium text-muted-foreground">Coste Total</CardTitle>
					<span class="material-symbols-rounded text-xl! text-muted-foreground">euro</span>
				</CardHeader>
				<CardContent>
					{#if loadingProjects}
						<Skeleton class="h-8 w-28" />
					{:else}
						<div class="text-2xl font-bold">{formatCost(totalCost)}</div>
						<p class="text-xs text-muted-foreground mt-1">inversión acumulada</p>
					{/if}
				</CardContent>
			</Card>

			<Card class="gap-2">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium text-muted-foreground"
						>Proyectos Activos</CardTitle
					>
					<span class="material-symbols-rounded text-xl! text-muted-foreground">folder</span>
				</CardHeader>
				<CardContent>
					{#if loadingProjects}
						<Skeleton class="h-8 w-16" />
					{:else}
						<div class="text-2xl font-bold">{activeProjectsCount}</div>
						<p class="text-xs text-muted-foreground mt-1">proyectos con actividad</p>
					{/if}
				</CardContent>
			</Card>

			<Card class="gap-2">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium text-muted-foreground">Trabajadores</CardTitle>
					<span class="material-symbols-rounded text-xl! text-muted-foreground">group</span>
				</CardHeader>
				<CardContent>
					{#if loadingWorkers}
						<Skeleton class="h-8 w-20" />
					{:else}
						<div class="text-2xl font-bold">{totalWorkersCount}</div>
						<p class="text-xs text-muted-foreground mt-1">con actividad registrada</p>
					{/if}
				</CardContent>
			</Card>
		</div>

		<div class="space-y-8">
			{#if projectsError}
				<Card>
					<CardContent class="py-8">
						<div class="flex flex-col items-center justify-center text-destructive">
							<span class="material-symbols-rounded text-3xl! mb-2">error</span>
							<p class="text-sm">{projectsError}</p>
							<button
								class="mt-4 text-sm text-primary hover:underline"
								onclick={() => loadProjects()}
							>
								Reintentar
							</button>
						</div>
					</CardContent>
				</Card>
			{:else if activeTab === 'proyectos'}
				<ProjectsChart {projects} loading={loadingProjects} />
			{/if}

			{#if workersError}
				<Card>
					<CardContent class="py-8">
						<div class="flex flex-col items-center justify-center text-destructive">
							<span class="material-symbols-rounded text-3xl! mb-2">error</span>
							<p class="text-sm">{workersError}</p>
							<button
								class="mt-4 text-sm text-primary hover:underline"
								onclick={() => loadWorkers()}
							>
								Reintentar
							</button>
						</div>
					</CardContent>
				</Card>
			{:else if activeTab === 'proyectos'}
				<WorkersChart {workers} loading={loadingWorkers} {currentUserId} />
			{/if}
		</div>
	</TabsContent>

		<TabsContent value="nominas" class="flex flex-col gap-6">
			<PayrollSummary />
		</TabsContent>
	</Tabs>
</div>

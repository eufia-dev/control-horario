<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { auth, isAdmin as isAdminStore } from '$lib/stores/auth';
	import ProjectsChart from '$lib/components/charts/projects-chart.svelte';
	import WorkersChart from '$lib/components/charts/workers-chart.svelte';
	import {
		fetchProjectsSummary,
		fetchWorkersSummary,
		formatCost,
		type ProjectSummary,
		type WorkerSummary
	} from '$lib/api/analytics';

	// Auth check - admin only
	let isAdmin = $state(false);
	$effect(() => {
		const unsub = isAdminStore.subscribe((value) => {
			isAdmin = value;
		});
		return unsub;
	});
	const currentUserId = $derived($auth.user?.id ?? null);

	// Data state
	let projects = $state<ProjectSummary[]>([]);
	let workers = $state<WorkerSummary[]>([]);

	// Loading states
	let loadingProjects = $state(true);
	let loadingWorkers = $state(true);

	// Error states
	let projectsError = $state<string | null>(null);
	let workersError = $state<string | null>(null);

	// Summary stats
	const totalHours = $derived(projects.reduce((sum, p) => sum + p.totalMinutes, 0) / 60);
	const totalCost = $derived(projects.reduce((sum, p) => sum + p.totalCost, 0));
	const activeProjectsCount = $derived(projects.length);
	const totalWorkersCount = $derived(workers.length);
	const internalWorkersCount = $derived(workers.filter((w) => w.type === 'internal').length);
	const externalWorkersCount = $derived(workers.filter((w) => w.type === 'external').length);

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

	onMount(() => {
		// Redirect non-admins
		const role = $auth.user?.role;
		if (role !== 'OWNER' && role !== 'ADMIN') {
			goto('/');
			return;
		}

		// Load data
		loadProjects();
		loadWorkers();
	});

	// Also check when auth changes
	$effect(() => {
		const role = $auth.user?.role;
		if (!$auth.isInitializing && role !== 'OWNER' && role !== 'ADMIN') {
			goto('/');
		}
	});
</script>

<div class="container mx-auto px-4 py-8">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-2xl font-bold tracking-tight">Analíticas</h1>
		<p class="text-muted-foreground mt-1">Dashboard con métricas y gráficos de proyectos</p>
	</div>

	<!-- Summary Cards -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
		<!-- Total Hours Card -->
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

		<!-- Total Cost Card -->
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

		<!-- Active Projects Card -->
		<Card class="gap-2">
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium text-muted-foreground">Proyectos Activos</CardTitle>
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

		<!-- Workers Card -->
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
					<p class="text-xs text-muted-foreground mt-1">
						{internalWorkersCount} internos · {externalWorkersCount} externos
					</p>
				{/if}
			</CardContent>
		</Card>
	</div>

	<!-- Charts -->
	<div class="space-y-8">
		<!-- Projects Chart -->
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
		{:else}
			<ProjectsChart {projects} loading={loadingProjects} />
		{/if}

		<!-- Workers Chart -->
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
		{:else}
			<WorkersChart {workers} loading={loadingWorkers} {currentUserId} />
		{/if}
	</div>
</div>

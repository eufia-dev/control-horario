<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import {
		canAccessCashFlow as canAccessCashFlowStore,
		isAdmin as isAdminStore
	} from '$lib/stores/auth';
	import { fetchProjects, type Project } from '$lib/api/projects';
	import {
		fetchAllProjectsCashFlow,
		formatCurrency,
		getMonthName,
		getMonthOptions,
		getYearOptions,
		type MonthCashFlow,
		type ProjectCashFlowSummary
	} from '$lib/api/cash-flow';
	import MonthlyDetailModal from './MonthlyDetailModal.svelte';

	// Simplified team type for filtering (extracted from projects)
	type TeamFilter = {
		id: string;
		name: string;
	};

	let canAccessCashFlow = $state(false);
	let isAdmin = $state(false);

	$effect(() => {
		const unsub = canAccessCashFlowStore.subscribe((value) => {
			canAccessCashFlow = value ?? false;
		});
		return unsub;
	});

	$effect(() => {
		const unsub = isAdminStore.subscribe((value) => {
			isAdmin = value ?? false;
		});
		return unsub;
	});

	// Date selection
	const currentDate = new Date();
	let selectedYear = $state(currentDate.getFullYear().toString());
	let selectedMonth = $state((currentDate.getMonth() + 1).toString());

	// Data
	let projects = $state<Project[]>([]);
	let projectCashFlowMap = $state<Map<string, ProjectCashFlowSummary>>(new Map());
	let teams = $state<TeamFilter[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Filters
	let searchQuery = $state('');
	let teamFilter = $state<string>('');

	// Modal
	let detailModalOpen = $state(false);
	let selectedProject = $state<Project | null>(null);

	// Options - convert to string values for Select
	const monthOptions = getMonthOptions().map((o) => ({
		value: o.value.toString(),
		label: o.label
	}));
	const yearOptions = getYearOptions().map((o) => ({ value: o.value.toString(), label: o.label }));

	const selectedMonthLabel = $derived(getMonthName(parseInt(selectedMonth)));
	const selectedYearLabel = $derived(selectedYear);
	const teamFilterLabel = $derived(
		teamFilter === ''
			? 'Todos los equipos'
			: (teams.find((t) => t.id === teamFilter)?.name ?? 'Todos los equipos')
	);

	// Filtered projects - only show projects returned by the cash flow API (respects permissions)
	const filteredProjects = $derived(
		projects.filter((project) => {
			// Only show projects that are in the cash flow response (handles team leader permissions)
			if (!loading && projectCashFlowMap.size > 0 && !projectCashFlowMap.has(project.id)) {
				return false;
			}
			// Search filter
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase();
				if (
					!project.code.toLowerCase().includes(query) &&
					!project.name.toLowerCase().includes(query) &&
					!(project.clientName?.toLowerCase().includes(query) ?? false) &&
					!(project.delegation?.toLowerCase().includes(query) ?? false)
				) {
					return false;
				}
			}
			// Team filter (only for admins)
			if (isAdmin && teamFilter && teamFilter !== '') {
				if (project.teamId !== teamFilter) {
					return false;
				}
			}
			return true;
		})
	);

	// Get the month data for a project
	function getProjectMonthData(projectId: string): MonthCashFlow | undefined {
		const projectData = projectCashFlowMap.get(projectId);
		if (!projectData) return undefined;
		const month = parseInt(selectedMonth);
		return projectData.months.find((m) => m.month === month);
	}

	// Summary totals
	const summaryTotals = $derived(() => {
		let totalRevenue = 0;
		let totalExternalCosts = 0;
		let totalInternalCosts = 0;

		for (const project of filteredProjects) {
			const data = getProjectMonthData(project.id);
			if (data) {
				totalRevenue += data.revenue.actual ?? 0;
				totalExternalCosts += data.externalCosts.actual;
				totalInternalCosts += data.internalCosts;
			}
		}

		const netResult = totalRevenue - totalExternalCosts - totalInternalCosts;

		return {
			totalRevenue,
			totalExternalCosts,
			totalInternalCosts,
			netResult
		};
	});

	async function loadData() {
		loading = true;
		error = null;
		try {
			const year = parseInt(selectedYear);
			const month = parseInt(selectedMonth);

			// Fetch projects metadata and cash flow data in parallel
			const [projectsData, cashFlowResponse] = await Promise.all([
				fetchProjects(),
				fetchAllProjectsCashFlow(year, month)
			]);

			// Store projects metadata (for code, clientName, delegation, team info)
			projects = projectsData.filter((p) => p.isActive);

			// Store cash flow data in a map for quick lookup
			const newMap = new Map<string, ProjectCashFlowSummary>();
			for (const projectCashFlow of cashFlowResponse.projects) {
				newMap.set(projectCashFlow.projectId, projectCashFlow);
			}
			projectCashFlowMap = newMap;

			// Extract unique teams from cash flow response (only includes accessible projects)
			const teamMap = new Map<string, TeamFilter>();
			for (const projectCashFlow of cashFlowResponse.projects) {
				if (projectCashFlow.teamId) {
					// Find team name from projects metadata
					const project = projects.find((p) => p.id === projectCashFlow.projectId);
					if (project?.team) {
						teamMap.set(project.team.id, { id: project.team.id, name: project.team.name });
					}
				}
			}
			teams = Array.from(teamMap.values()).sort((a, b) => a.name.localeCompare(b.name));
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar datos';
		} finally {
			loading = false;
		}
	}

	async function reloadCashFlowData() {
		try {
			const year = parseInt(selectedYear);
			const month = parseInt(selectedMonth);
			const cashFlowResponse = await fetchAllProjectsCashFlow(year, month);

			const newMap = new Map<string, ProjectCashFlowSummary>();
			for (const projectCashFlow of cashFlowResponse.projects) {
				newMap.set(projectCashFlow.projectId, projectCashFlow);
			}
			projectCashFlowMap = newMap;
		} catch (e) {
			console.error('Error reloading cash flow data:', e);
		}
	}

	function handleProjectClick(project: Project) {
		selectedProject = project;
		detailModalOpen = true;
	}

	function handleDetailModalClose() {
		selectedProject = null;
	}

	function handleDetailModalSuccess() {
		// Reload cash flow data after changes
		reloadCashFlowData();
	}

	// Track previous values for change detection
	let previousYear = $state<string | null>(null);
	let previousMonth = $state<string | null>(null);

	onMount(() => {
		previousYear = selectedYear;
		previousMonth = selectedMonth;
		loadData();
	});

	// Reload data when year/month changes
	$effect(() => {
		const currentYear = selectedYear;
		const currentMonth = selectedMonth;
		// Skip if not yet initialized (onMount hasn't run)
		if (previousYear === null || previousMonth === null) return;
		if (currentYear !== previousYear || currentMonth !== previousMonth) {
			previousYear = currentYear;
			previousMonth = currentMonth;
			loadData();
		}
	});
</script>

{#if canAccessCashFlow}
	<div class="container mx-auto px-4 py-8">
		<!-- Header -->
		<div class="mb-6">
			<div class="flex items-center gap-2 mb-4">
				<Button variant="ghost" size="sm" onclick={() => goto(resolve('/'))}>
					<span class="material-symbols-rounded text-lg!">arrow_back</span>
				</Button>
				<span class="material-symbols-rounded text-3xl!">account_balance</span>
				<h1 class="text-2xl font-semibold tracking-tight">Flujo de Caja</h1>
			</div>

			<!-- Month/Year Selector and Filters -->
			<div class="flex flex-wrap items-center gap-4">
				<div class="flex items-center gap-2">
					<Select type="single" bind:value={selectedMonth}>
						<SelectTrigger class="w-[140px] bg-card">
							{selectedMonthLabel}
						</SelectTrigger>
						<SelectContent>
							{#each monthOptions as option (option.value)}
								<SelectItem value={option.value} label={option.label} />
							{/each}
						</SelectContent>
					</Select>

					<Select type="single" bind:value={selectedYear}>
						<SelectTrigger class="w-[100px] bg-card">
							{selectedYearLabel}
						</SelectTrigger>
						<SelectContent>
							{#each yearOptions as option (option.value)}
								<SelectItem value={option.value} label={option.label} />
							{/each}
						</SelectContent>
					</Select>
				</div>

				<div class="flex items-center gap-2 ml-auto">
					<div class="relative">
						<span
							class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg!"
							>search</span
						>
						<Input
							type="text"
							placeholder="Buscar proyecto..."
							bind:value={searchQuery}
							class="pl-9 w-50 sm:w-80 bg-card"
						/>
					</div>

					{#if isAdmin && teams.length > 0}
						<Select type="single" bind:value={teamFilter}>
							<SelectTrigger class="w-[180px] bg-card">
								{teamFilterLabel}
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="" label="Todos los equipos" />
								{#each teams as team (team.id)}
									<SelectItem value={team.id} label={team.name} />
								{/each}
							</SelectContent>
						</Select>
					{/if}
				</div>
			</div>
		</div>

		<!-- Summary Cards -->
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
			<Card class="gap-2">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium text-muted-foreground">Producción Total</CardTitle>
					<span class="material-symbols-rounded text-xl! text-muted-foreground">trending_up</span>
				</CardHeader>
				<CardContent>
					{#if loading}
						<Skeleton class="h-8 w-28" />
					{:else}
						<div class="text-2xl font-bold text-green-600">
							{formatCurrency(summaryTotals().totalRevenue)}
						</div>
						<p class="text-xs text-muted-foreground mt-1">Ingresos del mes</p>
					{/if}
				</CardContent>
			</Card>

			<Card class="gap-2">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium text-muted-foreground">Costes Externos</CardTitle>
					<span class="material-symbols-rounded text-xl! text-muted-foreground"
						>account_balance_wallet</span
					>
				</CardHeader>
				<CardContent>
					{#if loading}
						<Skeleton class="h-8 w-28" />
					{:else}
						<div class="text-2xl font-bold text-red-600">
							{formatCurrency(summaryTotals().totalExternalCosts)}
						</div>
						<p class="text-xs text-muted-foreground mt-1">Proveedores y externos</p>
					{/if}
				</CardContent>
			</Card>

			<Card class="gap-2">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium text-muted-foreground">Costes Internos</CardTitle>
					<span class="material-symbols-rounded text-xl! text-muted-foreground">group</span>
				</CardHeader>
				<CardContent>
					{#if loading}
						<Skeleton class="h-8 w-28" />
					{:else}
						<div class="text-2xl font-bold text-orange-600">
							{formatCurrency(summaryTotals().totalInternalCosts)}
						</div>
						<p class="text-xs text-muted-foreground mt-1">Horas de equipo</p>
					{/if}
				</CardContent>
			</Card>

			<Card class="gap-2">
				<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle class="text-sm font-medium text-muted-foreground">Resultado Neto</CardTitle>
					<span class="material-symbols-rounded text-xl! text-muted-foreground">monitoring</span>
				</CardHeader>
				<CardContent>
					{#if loading}
						<Skeleton class="h-8 w-28" />
					{:else}
						{@const net = summaryTotals().netResult}
						<div class="text-2xl font-bold {net >= 0 ? 'text-green-600' : 'text-red-600'}">
							{formatCurrency(net)}
						</div>
						<p class="text-xs text-muted-foreground mt-1">
							{net >= 0 ? 'Beneficio' : 'Pérdida'} del mes
						</p>
					{/if}
				</CardContent>
			</Card>
		</div>

		<!-- Projects Table -->
		<Card>
			<CardHeader>
				<CardTitle class="text-xl font-semibold">
					Proyectos - {selectedMonthLabel}
					{selectedYear}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{#if loading}
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Proyecto</TableHead>
								<TableHead>Código</TableHead>
								<TableHead>Delegación</TableHead>
								<TableHead>Cliente</TableHead>
								<TableHead class="text-right">Prod. Est.</TableHead>
								<TableHead class="text-right">Prod. Real</TableHead>
								<TableHead class="text-right">Costes Ext. Est.</TableHead>
								<TableHead class="text-right">Costes Ext. Real</TableHead>
								<TableHead class="text-right">Costes Int.</TableHead>
								<TableHead class="text-right">Resultado</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
								<TableRow>
									<TableCell><Skeleton class="h-4 w-32" /></TableCell>
									<TableCell><Skeleton class="h-4 w-16" /></TableCell>
									<TableCell><Skeleton class="h-4 w-20" /></TableCell>
									<TableCell><Skeleton class="h-4 w-24" /></TableCell>
									<TableCell><Skeleton class="h-4 w-20" /></TableCell>
									<TableCell><Skeleton class="h-4 w-20" /></TableCell>
									<TableCell><Skeleton class="h-4 w-20" /></TableCell>
									<TableCell><Skeleton class="h-4 w-20" /></TableCell>
									<TableCell><Skeleton class="h-4 w-20" /></TableCell>
									<TableCell><Skeleton class="h-4 w-20" /></TableCell>
								</TableRow>
							{/each}
						</TableBody>
					</Table>
				{:else if error}
					<div class="flex items-center justify-center py-8 text-destructive">
						<span class="material-symbols-rounded mr-2">error</span>
						{error}
					</div>
				{:else if filteredProjects.length === 0}
					<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
						<span class="material-symbols-rounded text-4xl! mb-2">folder_off</span>
						<p>No hay proyectos disponibles</p>
					</div>
				{:else}
					<ScrollArea>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Proyecto</TableHead>
									<TableHead>Código</TableHead>
									<TableHead>Delegación</TableHead>
									<TableHead>Cliente</TableHead>
									<TableHead class="text-right">Prod. Est.</TableHead>
									<TableHead class="text-right">Prod. Real</TableHead>
									<TableHead class="text-right">Costes Ext. Est.</TableHead>
									<TableHead class="text-right">Costes Ext. Real</TableHead>
									<TableHead class="text-right">Costes Int.</TableHead>
									<TableHead class="text-right">Resultado</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#each filteredProjects as project (project.id)}
									{@const data = getProjectMonthData(project.id)}
									{@const netResult = data
										? (data.revenue.actual ?? 0) - data.externalCosts.actual - data.internalCosts
										: 0}
									<TableRow
										class="cursor-pointer hover:bg-muted/50"
										onclick={() => handleProjectClick(project)}
									>
										<TableCell class="font-medium">
											<Tooltip>
												<TooltipTrigger class="max-w-[200px] truncate block text-left">
													{project.name}
												</TooltipTrigger>
												<TooltipContent>
													<p>{project.name}</p>
												</TooltipContent>
											</Tooltip>
										</TableCell>
										<TableCell class="text-muted-foreground">{project.code}</TableCell>
										<TableCell class="text-muted-foreground">
											{project.delegation ?? '—'}
										</TableCell>
										<TableCell class="text-muted-foreground">
											{project.clientName ?? '—'}
										</TableCell>
										<TableCell class="text-right">
											<span class="text-muted-foreground">
												{formatCurrency(data?.revenue.estimated)}
											</span>
										</TableCell>
										<TableCell class="text-right">
											<span class="text-green-600">
												{formatCurrency(data?.revenue.actual)}
											</span>
										</TableCell>
										<TableCell class="text-right">
											<span class="text-muted-foreground">
												{formatCurrency(data?.externalCosts.estimated ?? 0)}
											</span>
										</TableCell>
										<TableCell class="text-right">
											<span class="text-red-600">
												{formatCurrency(data?.externalCosts.actual ?? 0)}
											</span>
										</TableCell>
										<TableCell class="text-right">
											<span class="text-orange-600">
												{formatCurrency(data?.internalCosts ?? 0)}
											</span>
										</TableCell>
										<TableCell class="text-right">
											<span
												class="font-semibold {netResult >= 0 ? 'text-green-600' : 'text-red-600'}"
											>
												{formatCurrency(netResult)}
											</span>
										</TableCell>
									</TableRow>
								{/each}
							</TableBody>
						</Table>
					</ScrollArea>
				{/if}
			</CardContent>
		</Card>
	</div>
{:else}
	<div class="container mx-auto px-4 py-8">
		<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
			<span class="material-symbols-rounded text-6xl! mb-4">lock</span>
			<h2 class="text-xl font-semibold mb-2">Acceso restringido</h2>
			<p>No tienes permisos para acceder al Flujo de Caja.</p>
			<Button variant="outline" class="mt-4" onclick={() => goto(resolve('/'))}>
				<span class="material-symbols-rounded mr-2 text-lg!">arrow_back</span>
				Volver al inicio
			</Button>
		</div>
	</div>
{/if}

<MonthlyDetailModal
	bind:open={detailModalOpen}
	project={selectedProject}
	year={parseInt(selectedYear)}
	month={parseInt(selectedMonth)}
	onClose={handleDetailModalClose}
	onSuccess={handleDetailModalSuccess}
/>

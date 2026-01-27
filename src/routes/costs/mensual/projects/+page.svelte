<script lang="ts">
	import { getContext } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { Input } from '$lib/components/ui/input';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { isAdmin as isAdminStore } from '$lib/stores/auth';
	import { fetchProjects, type Project } from '$lib/api/projects';
	import {
		fetchAllProjectsCosts,
		formatCurrency,
		getMonthName,
		type MonthCosts,
		type ProjectCostsSummary
	} from '$lib/api/costs';
	import MonthlyDetailModal from '../../MonthlyDetailModal.svelte';
	import { MENSUAL_CONTEXT_KEY, type MensualContext } from '../context';

	// Get context from layout
	const ctx = getContext<{ value: MensualContext }>(MENSUAL_CONTEXT_KEY);

	// Simplified team type for filtering (extracted from projects)
	type TeamFilter = {
		id: string;
		name: string;
	};

	let isAdmin = $state(false);

	$effect(() => {
		const unsub = isAdminStore.subscribe((value) => {
			isAdmin = value ?? false;
		});
		return unsub;
	});

	// Data
	let projects = $state<Project[]>([]);
	let projectCostsMap = $state<Map<string, ProjectCostsSummary>>(new Map());
	let teams = $state<TeamFilter[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Filters
	let searchQuery = $state('');
	let teamFilter = $state<string>('');

	// Modal
	let detailModalOpen = $state(false);
	let selectedProject = $state<Project | null>(null);

	// Derived values from context
	const year = $derived(ctx.value.year);
	const month = $derived(ctx.value.month);
	const loadingClosing = $derived(ctx.value.loadingClosing);
	const selectedMonthLabel = $derived(getMonthName(month));
	const selectedYearLabel = $derived(year.toString());

	const teamFilterLabel = $derived(
		teamFilter === ''
			? 'Todos los equipos'
			: (teams.find((t) => t.id === teamFilter)?.name ?? 'Todos los equipos')
	);

	// Filtered projects - only show projects returned by the costs API (respects permissions)
	const filteredProjects = $derived(
		projects.filter((project) => {
			// Only show projects that are in the costs response (handles team leader permissions)
			if (!loading && projectCostsMap.size > 0 && !projectCostsMap.has(project.id)) {
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

	// Get the costs data for a project
	function getProjectMonthData(projectId: string): MonthCosts | undefined {
		const projectData = projectCostsMap.get(projectId);
		if (!projectData) return undefined;
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

		// For non-admins (team leaders), exclude internal costs from net result
		const netResult = totalRevenue - totalExternalCosts - (isAdmin ? totalInternalCosts : 0);

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
			// Fetch projects metadata and costs data in parallel
			const [projectsData, costsResponse] = await Promise.all([
				fetchProjects(),
				fetchAllProjectsCosts(year, month)
			]);

			// Store projects metadata (for code, clientName, delegation, team info)
			projects = projectsData.filter((p) => p.isActive);

			// Store costs data in a map for quick lookup
			const newMap = new SvelteMap<string, ProjectCostsSummary>();
			for (const projectCosts of costsResponse.projects) {
				newMap.set(projectCosts.projectId, projectCosts);
			}
			projectCostsMap = newMap;

			// Extract unique teams from costs response
			const teamMap = new SvelteMap<string, TeamFilter>();
			for (const projectCosts of costsResponse.projects) {
				if (projectCosts.teamId && projectCosts.teamName) {
					teamMap.set(projectCosts.teamId, {
						id: projectCosts.teamId,
						name: projectCosts.teamName
					});
				}
			}
			teams = Array.from(teamMap.values()).sort((a, b) => a.name.localeCompare(b.name));
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar datos';
		} finally {
			loading = false;
		}
	}

	async function reloadCostsData() {
		try {
			const costsResponse = await fetchAllProjectsCosts(year, month);

			const newMap = new SvelteMap<string, ProjectCostsSummary>();
			for (const projectCosts of costsResponse.projects) {
				newMap.set(projectCosts.projectId, projectCosts);
			}
			projectCostsMap = newMap;
		} catch (e) {
			console.error('Error reloading costs data:', e);
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
		reloadCostsData();
	}

	// Track previous values for change detection and layout loading state
	let previousYear = $state<number | null>(null);
	let previousMonth = $state<number | null>(null);
	let initialLoadDone = $state(false);

	// Wait for layout to finish loading, then load data
	// This effect handles both initial load and subsequent year/month changes
	$effect(() => {
		const currentYear = year;
		const currentMonth = month;
		const layoutLoading = loadingClosing;

		// Wait for layout to finish loading the closing status
		if (layoutLoading) return;

		// Initial load
		if (!initialLoadDone) {
			previousYear = currentYear;
			previousMonth = currentMonth;
			initialLoadDone = true;
			loadData();
			return;
		}

		// Subsequent year/month changes
		if (currentYear !== previousYear || currentMonth !== previousMonth) {
			previousYear = currentYear;
			previousMonth = currentMonth;
			loadData();
		}
	});
</script>

<!-- Filters (search and team) -->
<div class="flex items-center gap-2 ml-auto -mt-12 mb-4 justify-end">
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

<!-- Summary Cards -->
<div class="grid gap-4 md:grid-cols-2 {isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}">
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

	{#if isAdmin}
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
	{/if}

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
			{selectedYearLabel}
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
						{#if isAdmin}
							<TableHead class="text-right">Costes Int.</TableHead>
						{/if}
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
							{#if isAdmin}
								<TableCell><Skeleton class="h-4 w-20" /></TableCell>
							{/if}
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
							{#if isAdmin}
								<TableHead class="text-right">Costes Int.</TableHead>
							{/if}
							<TableHead class="text-right">Resultado</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each filteredProjects as project (project.id)}
							{@const data = getProjectMonthData(project.id)}
							{@const netResult = data
								? (data.revenue.actual ?? 0) -
									data.externalCosts.actual -
									(isAdmin ? data.internalCosts : 0)
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
								{#if isAdmin}
									<TableCell class="text-right">
										<span class="text-orange-600">
											{formatCurrency(data?.internalCosts ?? 0)}
										</span>
									</TableCell>
								{/if}
								<TableCell class="text-right">
									<span class="font-semibold {netResult >= 0 ? 'text-green-600' : 'text-red-600'}">
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

<MonthlyDetailModal
	bind:open={detailModalOpen}
	project={selectedProject}
	{year}
	{month}
	onClose={handleDetailModalClose}
	onSuccess={handleDetailModalSuccess}
/>

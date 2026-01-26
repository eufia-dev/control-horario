<script lang="ts">
	import { onMount } from 'svelte';
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
	import { Button } from '$lib/components/ui/button';
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
		getMonthOptions,
		getYearOptions,
		type MonthCosts,
		type ProjectCostsSummary
	} from '$lib/api/costs';
	import {
		fetchMonthlyClosing,
		type MonthClosingStatus,
		type MonthlyClosingResponse
	} from '$lib/api/month-closing';
	import MonthlyDetailModal from '../MonthlyDetailModal.svelte';
	import MonthStatusBadge from './MonthStatusBadge.svelte';
	import SalariesTab from './SalariesTab.svelte';
	import OverheadCostsTab from './OverheadCostsTab.svelte';
	import DistributionTab from './DistributionTab.svelte';

	// Tab type
	type TabValue = 'projects' | 'salaries' | 'overhead' | 'distribution';

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

	// Date selection
	const currentDate = new Date();
	let selectedYear = $state(currentDate.getFullYear().toString());
	let selectedMonth = $state((currentDate.getMonth() + 1).toString());

	// Tab state
	let activeTab = $state<TabValue>('projects');

	// Month closing state
	let monthStatus = $state<MonthClosingStatus>('OPEN');
	let closingData = $state<MonthlyClosingResponse | null>(null);
	let loadingClosing = $state(false);

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

	// Tab definitions - admin-only tabs are filtered based on role
	const allTabs: { value: TabValue; label: string; icon: string; adminOnly: boolean }[] = [
		{ value: 'projects', label: 'Proyectos', icon: 'work', adminOnly: false },
		{ value: 'salaries', label: 'Salarios', icon: 'payments', adminOnly: true },
		{ value: 'overhead', label: 'Gastos Generales', icon: 'receipt_long', adminOnly: true },
		{ value: 'distribution', label: 'Distribución', icon: 'pie_chart', adminOnly: true }
	];

	const visibleTabs = $derived(allTabs.filter((tab) => !tab.adminOnly || isAdmin));

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

		// For non-admins (team leaders), exclude internal costs from net result
		const netResult = totalRevenue - totalExternalCosts - (isAdmin ? totalInternalCosts : 0);

		return {
			totalRevenue,
			totalExternalCosts,
			totalInternalCosts,
			netResult
		};
	});

	async function loadClosingStatus() {
		loadingClosing = true;
		try {
			const year = parseInt(selectedYear);
			const month = parseInt(selectedMonth);
			closingData = await fetchMonthlyClosing(year, month);
			monthStatus = closingData.status;
		} catch (e) {
			// If closing doesn't exist yet, default to OPEN
			monthStatus = 'OPEN';
			closingData = null;
		} finally {
			loadingClosing = false;
		}
	}

	async function loadData() {
		loading = true;
		error = null;
		try {
			const year = parseInt(selectedYear);
			const month = parseInt(selectedMonth);

			// Fetch projects metadata, costs data, and closing status in parallel
			const [projectsData, costsResponse] = await Promise.all([
				fetchProjects(),
				fetchAllProjectsCosts(year, month)
			]);

			// Also load closing status (but don't block on errors)
			loadClosingStatus();

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
			const year = parseInt(selectedYear);
			const month = parseInt(selectedMonth);
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

	function handleStatusChange(newStatus: MonthClosingStatus, newClosingData?: MonthlyClosingResponse) {
		monthStatus = newStatus;
		if (newClosingData) {
			closingData = newClosingData;
		}
	}

	function handleTabClick(tab: TabValue) {
		activeTab = tab;
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

<!-- Header with Month/Year Selector, Status Badge, and Filters -->
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

		<!-- Month Status Badge -->
		{#if !loadingClosing}
			<MonthStatusBadge
				status={monthStatus}
				closedAt={closingData?.closedAt}
				closedBy={closingData?.closedBy?.name}
			/>
		{/if}
	</div>

	<div class="flex items-center gap-2 ml-auto">
		{#if activeTab === 'projects'}
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
		{/if}
	</div>
</div>

<!-- Tab Navigation (Admin only for Salarios, Gastos Generales, Distribución) -->
<div class="overflow-x-auto -mb-2">
	<nav
		class="bg-muted text-muted-foreground inline-flex w-fit items-center justify-center rounded-lg p-[3px]"
	>
		{#each visibleTabs as tab (tab.value)}
			<button
				type="button"
				onclick={() => handleTabClick(tab.value)}
				data-state={activeTab === tab.value ? 'active' : 'inactive'}
				class="data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-3 py-1.5 text-sm font-medium transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] data-[state=active]:shadow-sm cursor-pointer"
			>
				<span class="material-symbols-rounded text-lg!">{tab.icon}</span>
				<span>{tab.label}</span>
			</button>
		{/each}
	</nav>
</div>

<!-- Tab Content -->
{#if activeTab === 'projects'}
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
									? (data.revenue.actual ?? 0) - data.externalCosts.actual - (isAdmin ? data.internalCosts : 0)
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
{:else if activeTab === 'salaries' && isAdmin}
	<SalariesTab
		year={parseInt(selectedYear)}
		month={parseInt(selectedMonth)}
		{monthStatus}
		onStatusChange={handleStatusChange}
	/>
{:else if activeTab === 'overhead' && isAdmin}
	<OverheadCostsTab
		year={parseInt(selectedYear)}
		month={parseInt(selectedMonth)}
		{monthStatus}
		onStatusChange={handleStatusChange}
	/>
{:else if activeTab === 'distribution' && isAdmin}
	<DistributionTab
		year={parseInt(selectedYear)}
		month={parseInt(selectedMonth)}
		{monthStatus}
		onStatusChange={handleStatusChange}
	/>
{/if}

<MonthlyDetailModal
	bind:open={detailModalOpen}
	project={selectedProject}
	year={parseInt(selectedYear)}
	month={parseInt(selectedMonth)}
	onClose={handleDetailModalClose}
	onSuccess={handleDetailModalSuccess}
/>

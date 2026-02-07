<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';
	import { isAdmin as isAdminStore } from '$lib/stores/auth';
	import {
		fetchAnnualCosts,
		saveAnnualCosts,
		getMonthName,
		getYearOptions,
		type AnnualCostsResponse,
		type AnnualProjectCosts,
		type AnnualMonthCosts,
		type SaveAnnualCostsDto,
		type SaveAnnualCostItem,
		type CostEstimate,
		type CostActual
	} from '$lib/api/costs';
	import BulkCostCell from './BulkCostCell.svelte';
	import BulkCostsDialog from './BulkCostsDialog.svelte';

	// Simplified team type for filtering
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

	// Year selection
	const currentDate = new Date();
	let selectedYear = $state(currentDate.getFullYear().toString());

	// Data
	let annualData = $state<AnnualCostsResponse | null>(null);
	let teams = $state<TeamFilter[]>([]);
	let loading = $state(true);
	let saving = $state(false);
	let saveSuccess = $state(false);
	let error = $state<string | null>(null);
	let saveError = $state<string | null>(null);

	// Filters
	let searchQuery = $state('');
	let teamFilter = $state<string>('');

	// Change tracking - key format: `${projectId}-${month}`
	type CellChange = {
		revenue?: {
			estimatedRevenue?: number | null;
			actualRevenue?: number | null;
		};
		costEstimate?: {
			action: 'create' | 'update';
			id?: string;
			amount: number;
		};
	};

	let pendingChanges = $state<Map<string, CellChange>>(new SvelteMap());

	// Dialog state
	let costsDialogOpen = $state(false);
	let dialogProjectId = $state<string>('');
	let dialogProjectName = $state<string>('');
	let dialogMonth = $state<number>(1);
	let dialogInitialTab = $state<'estimates' | 'actuals'>('estimates');

	// Options
	const yearOptions = getYearOptions().map((o) => ({ value: o.value.toString(), label: o.label }));
	const months = Array.from({ length: 12 }, (_, i) => i + 1);

	const selectedYearLabel = $derived(selectedYear);
	const teamFilterLabel = $derived(
		teamFilter === ''
			? 'Todos los equipos'
			: (teams.find((t) => t.id === teamFilter)?.name ?? 'Todos los equipos')
	);

	const hasChanges = $derived(pendingChanges.size > 0);

	// Filter projects
	const filteredProjects = $derived(() => {
		if (!annualData) return [];
		return annualData.projects.filter((project) => {
			// Search filter
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase();
				if (
					!project.projectCode.toLowerCase().includes(query) &&
					!project.projectName.toLowerCase().includes(query)
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
		});
	});

	// Get month data for a project
	function getMonthData(project: AnnualProjectCosts, month: number): AnnualMonthCosts | undefined {
		return project.months.find((m) => m.month === month);
	}

	// Check if a cell has changes
	function isCellChanged(projectId: string, month: number): boolean {
		return pendingChanges.has(`${projectId}-${month}`);
	}

	// Get current values (merged with pending changes)
	function getCurrentMonthData(
		project: AnnualProjectCosts,
		month: number
	): AnnualMonthCosts | undefined {
		const original = getMonthData(project, month);
		if (!original) return undefined;

		const change = pendingChanges.get(`${project.projectId}-${month}`);
		if (!change) return original;

		// Merge changes with original
		return {
			...original,
			estimatedRevenue: change.revenue?.estimatedRevenue ?? original.estimatedRevenue,
			actualRevenue: change.revenue?.actualRevenue ?? original.actualRevenue
		};
	}

	// Handle revenue change
	function handleRevenueChange(
		projectId: string,
		month: number,
		field: 'estimatedRevenue' | 'actualRevenue',
		value: number | null,
		originalData: AnnualMonthCosts
	) {
		const key = `${projectId}-${month}`;
		const existing = pendingChanges.get(key) ?? {};

		// Check if value is different from original
		const originalValue = originalData[field];
		if (value === originalValue) {
			// If reverting to original, check if we should remove the change entry
			if (existing.revenue) {
				const newRevenue = { ...existing.revenue };
				delete newRevenue[field];
				if (Object.keys(newRevenue).length === 0 && !existing.costEstimate) {
					pendingChanges.delete(key);
				} else {
					pendingChanges.set(key, { ...existing, revenue: newRevenue });
				}
			}
			pendingChanges = new SvelteMap(pendingChanges);
			return;
		}

		pendingChanges.set(key, {
			...existing,
			revenue: {
				...existing.revenue,
				[field]: value
			}
		});
		pendingChanges = new SvelteMap(pendingChanges);
	}

	// Handle cost estimate change (for 0 or 1 item cases)
	function handleCostEstimateChange(
		projectId: string,
		month: number,
		value: number | null,
		originalData: AnnualMonthCosts
	) {
		const key = `${projectId}-${month}`;
		const existing = pendingChanges.get(key) ?? {};

		// Determine if create or update
		const existingEstimate = originalData.estimatedCosts[0];

		if (value === null) {
			// Clear the cost estimate change
			if (existing.costEstimate) {
				const newChange = { ...existing };
				delete newChange.costEstimate;
				if (!newChange.revenue || Object.keys(newChange.revenue).length === 0) {
					pendingChanges.delete(key);
				} else {
					pendingChanges.set(key, newChange);
				}
			}
			pendingChanges = new SvelteMap(pendingChanges);
			return;
		}

		// Check if value is same as original
		if (existingEstimate && value === existingEstimate.amount) {
			// Reverting to original
			if (existing.costEstimate) {
				const newChange = { ...existing };
				delete newChange.costEstimate;
				if (!newChange.revenue || Object.keys(newChange.revenue).length === 0) {
					pendingChanges.delete(key);
				} else {
					pendingChanges.set(key, newChange);
				}
			}
			pendingChanges = new SvelteMap(pendingChanges);
			return;
		}

		pendingChanges.set(key, {
			...existing,
			costEstimate: existingEstimate
				? { action: 'update', id: existingEstimate.id, amount: value }
				: { action: 'create', amount: value }
		});
		pendingChanges = new SvelteMap(pendingChanges);
	}

	// Open dialog for estimates
	function openEstimatesDialog(project: AnnualProjectCosts, month: number) {
		dialogProjectId = project.projectId;
		dialogProjectName = project.projectName;
		dialogMonth = month;
		dialogInitialTab = 'estimates';
		costsDialogOpen = true;
	}

	// Open dialog for actuals
	function openActualsDialog(project: AnnualProjectCosts, month: number) {
		dialogProjectId = project.projectId;
		dialogProjectName = project.projectName;
		dialogMonth = month;
		dialogInitialTab = 'actuals';
		costsDialogOpen = true;
	}

	// Get costs for dialog
	function getDialogCosts(): { estimates: CostEstimate[]; actuals: CostActual[] } {
		if (!annualData) return { estimates: [], actuals: [] };
		const project = annualData.projects.find((p) => p.projectId === dialogProjectId);
		if (!project) return { estimates: [], actuals: [] };
		const monthData = project.months.find((m) => m.month === dialogMonth);
		if (!monthData) return { estimates: [], actuals: [] };
		return {
			estimates: monthData.estimatedCosts,
			actuals: monthData.actualCosts
		};
	}

	const dialogCosts = $derived(getDialogCosts());

	// Load data
	async function loadData() {
		loading = true;
		error = null;
		try {
			const year = parseInt(selectedYear);
			annualData = await fetchAnnualCosts(year);

			// Extract unique teams from response
			const teamMap = new SvelteMap<string, TeamFilter>();
			for (const project of annualData.projects) {
				if (project.teamId && project.teamName) {
					teamMap.set(project.teamId, { id: project.teamId, name: project.teamName });
				}
			}
			teams = Array.from(teamMap.values()).sort((a, b) => a.name.localeCompare(b.name));

			// Clear pending changes when loading new data
			pendingChanges = new SvelteMap();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar datos';
		} finally {
			loading = false;
		}
	}

	// Save changes
	async function handleSave() {
		if (!hasChanges || saving) return;

		saving = true;
		saveError = null;
		saveSuccess = false;

		try {
			const year = parseInt(selectedYear);
			const items: SaveAnnualCostItem[] = [];

			for (const [key, change] of pendingChanges) {
				// Key format is `${projectId}-${month}` where projectId is a UUID with hyphens
				// So we need to extract the last segment as the month
				const lastHyphenIndex = key.lastIndexOf('-');
				const projectId = key.substring(0, lastHyphenIndex);
				const month = parseInt(key.substring(lastHyphenIndex + 1));
				items.push({
					projectId,
					month,
					revenue: change.revenue,
					costEstimate: change.costEstimate
				});
			}

			const payload: SaveAnnualCostsDto = { year, items };
			await saveAnnualCosts(payload);

			saveSuccess = true;
			setTimeout(() => {
				saveSuccess = false;
			}, 2000);

			// Reload data to get fresh values
			await loadData();
		} catch (e) {
			saveError = e instanceof Error ? e.message : 'Error al guardar';
		} finally {
			saving = false;
		}
	}

	// Discard changes
	function handleDiscardChanges() {
		pendingChanges = new SvelteMap();
		saveError = null;
	}

	// Handle dialog data change - reload data
	function handleDialogDataChange() {
		loadData();
	}

	// Track year changes
	let previousYear = $state<string | null>(null);

	onMount(() => {
		previousYear = selectedYear;
		loadData();
	});

	$effect(() => {
		const currentYear = selectedYear;
		if (previousYear === null) return;
		if (currentYear !== previousYear) {
			previousYear = currentYear;
			loadData();
		}
	});
</script>

<!-- Year Selector and Filters -->
<div class="flex flex-wrap items-center gap-4">
	<div class="flex items-center gap-2">
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

	<div class="hidden md:block flex-1"></div>

	<div class="relative w-full md:w-auto">
		<span
			class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg!"
			>search</span
		>
		<Input
			type="text"
			placeholder="Buscar proyecto"
			bind:value={searchQuery}
			class="pl-9 md:w-80 bg-card"
		/>
	</div>

	{#if isAdmin && teams.length > 0}
		<div class="w-full md:w-auto">
			<Select type="single" bind:value={teamFilter}>
				<SelectTrigger class="w-full md:w-[180px] bg-card">
					{teamFilterLabel}
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="" label="Todos los equipos" />
					{#each teams as team (team.id)}
						<SelectItem value={team.id} label={team.name} />
					{/each}
				</SelectContent>
			</Select>
		</div>
	{/if}
</div>

<!-- Floating Save Bar -->
{#if hasChanges || saveError}
	<div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-auto max-w-[calc(100%-3rem)]">
		<div
			class="flex items-center justify-between gap-4 px-5 py-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl shadow-lg backdrop-blur-sm"
		>
			<div class="flex items-center gap-2">
				<span class="material-symbols-rounded text-warning">edit_note</span>
				<span class="text-sm font-medium text-warning">
					{pendingChanges.size}
					{pendingChanges.size === 1 ? 'cambio pendiente' : 'cambios pendientes'}
				</span>
				{#if saveError}
					<span class="text-sm text-destructive ml-2">{saveError}</span>
				{/if}
			</div>
			<div class="flex items-center gap-2">
				<Button variant="outline" size="sm" onclick={handleDiscardChanges} disabled={saving}>
					<span class="material-symbols-rounded text-lg! mr-1">undo</span>
					Descartar
				</Button>
				<Button
					size="sm"
					onclick={handleSave}
					disabled={saving}
					variant={saveSuccess ? 'success' : 'default'}
					class="min-w-24"
				>
					{#if saving}
						<span class="material-symbols-rounded animate-spin text-lg!">progress_activity</span>
					{:else if saveSuccess}
						<span class="material-symbols-rounded text-lg! animate-in zoom-in duration-200"
							>check_circle</span
						>
						Guardado
					{:else}
						<span class="material-symbols-rounded text-lg! mr-1">save</span>
						Guardar
					{/if}
				</Button>
			</div>
		</div>
	</div>
{/if}

<!-- Matrix Table -->
<Card>
	<CardHeader class="flex-row items-center justify-between space-y-0 w-full">
		<CardTitle class="text-xl font-semibold flex items-center gap-6 justify-between w-full">
			<div class="flex items-center gap-2">
				<span class="material-symbols-rounded text-2xl!">grid_on</span>
				Anual - {selectedYear}
			</div>
			<div class="flex items-center gap-4 text-xs">
				<div class="flex items-center gap-1 text-success">
					<span class="material-symbols-rounded text-sm!">trending_up</span>
					<span>Ing. est.</span>
				</div>
				<div class="flex items-center gap-1 text-success">
					<span class="material-symbols-rounded text-sm!">check_circle</span>
					<span>Ing. real</span>
				</div>
				<div class="flex items-center gap-1 text-destructive">
					<span class="material-symbols-rounded text-sm!">trending_down</span>
					<span>Coste est.</span>
				</div>
				<div class="flex items-center gap-1 text-destructive">
					<span class="material-symbols-rounded text-sm!">receipt_long</span>
					<span>Coste real</span>
				</div>
			</div>
		</CardTitle>
	</CardHeader>
	<CardContent class="p-0">
		{#if loading}
			<div class="overflow-x-auto">
				<div class="p-6">
					<div class="space-y-4">
						{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
							<div class="flex gap-2">
								<Skeleton class="h-[104px] w-48 shrink-0" />
								{#each Array.from({ length: 12 }, (_, j) => j) as j (j)}
									<Skeleton class="h-[104px] w-36 shrink-0" />
								{/each}
							</div>
						{/each}
					</div>
				</div>
			</div>
		{:else if error}
			<div class="flex items-center justify-center py-12 text-destructive">
				<span class="material-symbols-rounded mr-2">error</span>
				{error}
			</div>
		{:else if filteredProjects().length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
				<span class="material-symbols-rounded text-4xl! mb-2">folder_off</span>
				<p>No hay proyectos disponibles</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full border-collapse">
					<thead>
						<tr class="border-b">
							<th
								class="sticky left-0 z-20 bg-card pl-4 pr-3 text-left text-sm font-semibold border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
							>
								Proyecto
							</th>
							{#each months as month (month)}
								<th class="p-2 text-center text-sm font-medium">
									<span class="font-semibold text-foreground">{getMonthName(month)}</span>
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each filteredProjects() as project (project.projectId)}
							<tr class="border-b hover:bg-muted/30">
								<td
									class="sticky left-0 z-10 bg-card pl-4 pr-3 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
								>
									<Tooltip>
										<TooltipTrigger class="text-left">
											<div class="max-w-20">
												<div class="font-medium text-sm truncate">{project.projectName}</div>
												<div class="text-xs text-muted-foreground">{project.projectCode}</div>
											</div>
										</TooltipTrigger>
										<TooltipContent>
											<p>{project.projectName}</p>
											<p class="text-xs text-muted-foreground">{project.projectCode}</p>
										</TooltipContent>
									</Tooltip>
								</td>
								{#each months as month (month)}
									{@const monthData = getMonthData(project, month)}
									{@const currentData = getCurrentMonthData(project, month)}
									<td class="p-1">
										{#if monthData && currentData}
											<BulkCostCell
												estimatedRevenue={currentData.estimatedRevenue}
												actualRevenue={currentData.actualRevenue}
												estimatedCosts={monthData.estimatedCosts}
												estimatedCostsTotal={monthData.estimatedCostsTotal}
												actualCostsTotal={monthData.actualCostsTotal}
												isChanged={isCellChanged(project.projectId, month)}
												onRevenueChange={(field, value) =>
													handleRevenueChange(project.projectId, month, field, value, monthData)}
												onCostEstimateChange={(value) =>
													handleCostEstimateChange(project.projectId, month, value, monthData)}
												onOpenEstimatesDialog={() => openEstimatesDialog(project, month)}
												onOpenActualsDialog={() => openActualsDialog(project, month)}
											/>
										{:else}
											<div
												class="h-[104px] flex items-center justify-center text-xs text-muted-foreground"
											>
												—
											</div>
										{/if}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</CardContent>
</Card>

<!-- Costs Dialog -->
<BulkCostsDialog
	bind:open={costsDialogOpen}
	projectId={dialogProjectId}
	projectName={dialogProjectName}
	year={parseInt(selectedYear)}
	month={dialogMonth}
	estimatedCosts={dialogCosts.estimates}
	actualCosts={dialogCosts.actuals}
	initialTab={dialogInitialTab}
	onClose={() => {}}
	onDataChange={handleDialogDataChange}
/>

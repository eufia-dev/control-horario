<script lang="ts">
	import { getContext } from 'svelte';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import {
		fetchMonthlyClosing,
		fetchClosingPreview,
		type MonthlyClosingResponse,
		type DistributionPreviewResponse,
		type ProjectDistribution,
		type ValidationError
	} from '$lib/api/month-closing';
	import { formatCurrency } from '$lib/api/costs';
	import CloseMonthDialog from '../CloseMonthDialog.svelte';
	import ReopenMonthDialog from '../ReopenMonthDialog.svelte';
	import { MENSUAL_CONTEXT_KEY, type MensualContext } from '../context';

	// Get context from layout
	const ctx = getContext<{ value: MensualContext }>(MENSUAL_CONTEXT_KEY);

	// Derived values from context
	const year = $derived(ctx.value.year);
	const month = $derived(ctx.value.month);
	const monthStatus = $derived(ctx.value.monthStatus);
	const loadingClosing = $derived(ctx.value.loadingClosing);
	const onStatusChange = $derived(ctx.value.onStatusChange);

	let loading = $state(true);
	let error = $state<string | null>(null);

	// Data for closed/reopened months
	let closingData = $state<MonthlyClosingResponse | null>(null);
	// Data for open months (preview)
	let previewData = $state<DistributionPreviewResponse | null>(null);

	let closeDialogOpen = $state(false);
	let reopenDialogOpen = $state(false);

	// Track year/month/status changes and layout loading state
	let previousYear = $state<number | null>(null);
	let previousMonth = $state<number | null>(null);
	let previousStatus = $state<string | null>(null);

	async function loadData(currentStatus: string) {
		loading = true;
		error = null;
		try {
			if (currentStatus === 'OPEN') {
				previewData = await fetchClosingPreview(year, month);
				closingData = null;
			} else if (currentStatus === 'REOPENED') {
				// For reopened months, we need both: closingData for audit info and previewData for closing
				const [closing, preview] = await Promise.all([
					fetchMonthlyClosing(year, month),
					fetchClosingPreview(year, month)
				]);
				closingData = closing;
				previewData = preview;
			} else {
				// CLOSED status - only need closing data
				closingData = await fetchMonthlyClosing(year, month);
				previewData = null;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar datos';
		} finally {
			loading = false;
		}
	}

	function handleCloseMonth() {
		closeDialogOpen = true;
	}

	function handleReopenMonth() {
		reopenDialogOpen = true;
	}

	async function handleCloseSuccess(newClosingData: MonthlyClosingResponse) {
		// Update status first, then reload data to get fresh closing data
		onStatusChange?.('CLOSED', newClosingData);
		closingData = newClosingData;
		previewData = null;
	}

	async function handleReopenSuccess(newClosingData: MonthlyClosingResponse) {
		// Update status first, then reload data to fetch preview for re-closing
		onStatusChange?.('REOPENED', newClosingData);
		closingData = newClosingData;
		// Fetch preview data so user can close again without page reload
		try {
			previewData = await fetchClosingPreview(year, month);
		} catch {
			// If preview fetch fails, user can still see the page but may need to reload
			previewData = null;
		}
	}

	function formatDate(dateString: string | null): string {
		if (!dateString) return '—';
		return new Date(dateString).toLocaleDateString('es-ES', {
			day: '2-digit',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getValidationIcon(type: ValidationError['type']): string {
		switch (type) {
			case 'MISSING_SALARY':
				return 'person_off';
			case 'MISSING_REVENUE':
				return 'money_off';
			case 'NO_ACTIVE_PROJECTS':
				return 'folder_off';
			case 'ZERO_REVENUE':
				return 'trending_flat';
			default:
				return 'error';
		}
	}

	// Wait for layout to finish loading, then load data
	// This effect handles both initial load and subsequent year/month/status changes
	$effect(() => {
		const currentYear = year;
		const currentMonth = month;
		const currentStatus = monthStatus;
		const layoutLoading = loadingClosing;

		// Wait for layout to finish loading the closing status
		if (layoutLoading) return;

		// Check if anything relevant changed (year, month, or status)
		const yearChanged = currentYear !== previousYear;
		const monthChanged = currentMonth !== previousMonth;
		const statusChanged = currentStatus !== previousStatus;

		if (yearChanged || monthChanged || statusChanged) {
			previousYear = currentYear;
			previousMonth = currentMonth;
			previousStatus = currentStatus;
			// Pass the current status to loadData to ensure we use the correct status
			// This avoids race conditions where monthStatus might be stale
			loadData(currentStatus);
		}
	});

	// Computed distributions
	const distributions = $derived.by(() => {
		if (monthStatus === 'OPEN' && previewData) {
			return previewData.distributions;
		}
		if (closingData?.distributions) {
			return closingData.distributions;
		}
		return [] as ProjectDistribution[];
	});

	// Computed totals
	const totals = $derived.by(() => {
		if (monthStatus === 'OPEN' && previewData) {
			return {
				salaries: previewData.totalSalaries,
				overhead: previewData.totalOverhead,
				nonProductive: previewData.totalNonProductive,
				absenceCosts: previewData.totalAbsenceCosts,
				directSalaryCosts: previewData.totalDirectSalaryCosts,
				revenue: previewData.totalRevenue
			};
		}
		if (closingData) {
			return {
				salaries: closingData.totalSalaries ?? 0,
				overhead: closingData.totalOverhead ?? 0,
				nonProductive: closingData.totalNonProductive ?? 0,
				absenceCosts: closingData.totalAbsenceCosts ?? 0,
				directSalaryCosts: closingData.totalDirectSalaryCosts ?? 0,
				revenue: closingData.totalRevenue ?? 0
			};
		}
		return {
			salaries: 0,
			overhead: 0,
			nonProductive: 0,
			absenceCosts: 0,
			directSalaryCosts: 0,
			revenue: 0
		};
	});
</script>

<div class="space-y-4">
	<!-- Summary Cards -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
		<!-- Ingresos Card -->
		<Card>
			<CardHeader>
				<CardTitle class="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
			</CardHeader>
			<CardContent>
				{#if loading}
					<Skeleton class="h-8 w-28" />
				{:else}
					<div class="text-2xl font-bold text-success">{formatCurrency(totals.revenue)}</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Gastos Generales Card -->
		<Card>
			<CardHeader>
				<CardTitle class="text-sm font-medium text-muted-foreground">Gastos Generales</CardTitle>
			</CardHeader>
			<CardContent>
				{#if loading}
					<Skeleton class="h-8 w-28" />
				{:else}
					<div class="text-2xl font-bold">{formatCurrency(totals.overhead)}</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Salarios Card with breakdown - spans 2 columns on lg -->
		<Card class="md:col-span-2">
			<CardHeader>
				<CardTitle class="text-sm font-medium text-muted-foreground">Total Salarios</CardTitle>
			</CardHeader>
			<CardContent>
				{#if loading}
					<div class="flex items-center justify-between">
						<Skeleton class="h-8 w-32" />
						<div class="flex gap-6">
							<Skeleton class="h-12 w-24" />
							<Skeleton class="h-12 w-24" />
							<Skeleton class="h-12 w-24" />
						</div>
					</div>
				{:else}
					<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<!-- Main total on the left -->
						<div class="text-2xl font-bold">{formatCurrency(totals.salaries)}</div>
						
						<!-- Breakdown on the right -->
						<div class="hidden md:flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-6 -mt-6">
							<div class="flex flex-col items-center px-4 py-2 rounded-lg bg-muted/50">
								<span class="text-xs text-muted-foreground mb-0.5">Directos</span>
								<span class="text-sm font-semibold">{formatCurrency(totals.directSalaryCosts)}</span>
							</div>
							<div class="flex flex-col items-center px-4 py-2 rounded-lg bg-muted/50">
								<span class="text-xs text-muted-foreground mb-0.5">No productivos</span>
								<span class="text-sm font-semibold">{formatCurrency(totals.nonProductive)}</span>
							</div>
						</div>
					</div>
				{/if}
			</CardContent>
		</Card>
	</div>

	<!-- Main Content -->
	<Card>
		<CardHeader>
			<div class="flex items-center justify-between">
				<div>
					<CardTitle class="text-lg">
						{monthStatus === 'OPEN' ? 'Vista Previa de Distribución' : 'Distribución de Costes'}
					</CardTitle>
					<p class="text-sm text-muted-foreground mt-1">
						{#if monthStatus === 'OPEN'}
							Revisa cómo se distribuirán los costes antes de cerrar el mes
						{:else}
							Distribución de costes por proyecto según ingresos
						{/if}
					</p>
				</div>
				<div class="flex items-center gap-2">
					{#if monthStatus === 'OPEN'}
						<Button
							onclick={handleCloseMonth}
							disabled={loading || (previewData && !previewData.canClose)}
						>
							<span class="material-symbols-rounded text-lg! mr-1">lock</span>
							Cerrar Mes
						</Button>
					{:else if monthStatus === 'CLOSED'}
						<Button variant="outline" onclick={handleReopenMonth} disabled={loading}>
							<span class="material-symbols-rounded text-lg! mr-1">lock_open</span>
							Reabrir Mes
						</Button>
					{:else if monthStatus === 'REOPENED'}
						<Button
							onclick={handleCloseMonth}
							disabled={loading || (previewData && !previewData.canClose)}
						>
							<span class="material-symbols-rounded text-lg! mr-1">lock</span>
							Volver a Cerrar
						</Button>
					{/if}
				</div>
			</div>
		</CardHeader>
		<CardContent>
			{#if loading}
				<div class="space-y-3">
					{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
						<div class="flex items-center gap-4">
							<Skeleton class="h-10 w-40" />
							<Skeleton class="h-10 w-24" />
							<Skeleton class="h-10 w-20" />
							<Skeleton class="h-10 w-24" />
							<Skeleton class="h-10 w-24" />
						</div>
					{/each}
				</div>
			{:else if error}
				<div class="flex flex-col items-center justify-center py-8 text-destructive">
					<span class="material-symbols-rounded text-3xl! mb-2">error</span>
					<p>{error}</p>
					<Button variant="outline" size="sm" class="mt-4" onclick={() => loadData(monthStatus)}>
						<span class="material-symbols-rounded mr-1 text-lg!">refresh</span>
						Reintentar
					</Button>
				</div>
			{:else}
				<!-- Validation Errors (only for OPEN months) -->
				{#if monthStatus === 'OPEN' && previewData && previewData.validationErrors.length > 0}
					<div
						class="mb-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg"
					>
						<div class="flex items-start gap-2 mb-3">
							<span class="material-symbols-rounded text-red-600 text-lg!">error</span>
							<div>
								<p class="text-sm font-medium text-red-800 dark:text-red-200">
									No se puede cerrar el mes
								</p>
								<p class="text-xs text-red-600 dark:text-red-400 mt-1">
									Corrige los siguientes errores antes de continuar:
								</p>
							</div>
						</div>
						<ul class="space-y-2">
							{#each previewData.validationErrors as validationError (validationError.type + (validationError.details?.userName ?? '') + (validationError.details?.projectName ?? ''))}
								<li class="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
									<span class="material-symbols-rounded text-sm!">
										{getValidationIcon(validationError.type)}
									</span>
									<span>{validationError.message}</span>
									{#if validationError.details?.userName}
										<Badge variant="outline" class="text-xs">
											{validationError.details.userName}
										</Badge>
									{/if}
									{#if validationError.details?.projectName}
										<Badge variant="outline" class="text-xs">
											{validationError.details.projectName}
										</Badge>
									{/if}
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				<!-- Audit Info (for CLOSED/REOPENED months) -->
				{#if monthStatus !== 'OPEN' && closingData}
					<div class="mb-4 p-3 bg-muted rounded-lg text-sm">
						<div class="flex flex-wrap gap-4">
							{#if closingData.closedAt && closingData.closedBy}
								<div class="flex items-center gap-2">
									<span class="material-symbols-rounded text-sm! text-muted-foreground">lock</span>
									<span class="text-muted-foreground">Cerrado:</span>
									<span>{formatDate(closingData.closedAt)} por {closingData.closedBy.name}</span>
								</div>
							{/if}
							{#if closingData.reopenedAt && closingData.reopenedBy}
								<div class="flex items-center gap-2">
									<span class="material-symbols-rounded text-sm! text-muted-foreground"
										>lock_open</span
									>
									<span class="text-muted-foreground">Reabierto:</span>
									<span>{formatDate(closingData.reopenedAt)} por {closingData.reopenedBy.name}</span
									>
								</div>
							{/if}
							{#if closingData.reopenReason}
								<div class="flex items-center gap-2 w-full">
									<span class="material-symbols-rounded text-sm! text-muted-foreground">notes</span>
									<span class="text-muted-foreground">Motivo:</span>
									<span>{closingData.reopenReason}</span>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Distribution Table -->
				{#if distributions.length === 0}
					<div
						class="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg border-dashed"
					>
						<span class="material-symbols-rounded text-4xl! mb-2">folder_off</span>
						<p>No hay proyectos activos con ingresos para distribuir</p>
					</div>
				{:else}
					<ScrollArea class="max-h-[400px]">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Proyecto</TableHead>
									<TableHead class="text-right">Ingresos</TableHead>
									<TableHead class="text-right">%</TableHead>
									<TableHead class="text-right">Salarios Directos</TableHead>
									<TableHead class="text-right">Salarios Dist.</TableHead>
									<TableHead class="text-right">Gastos Gen.</TableHead>
									<TableHead class="text-right">Total</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#each distributions as dist (dist.projectId)}
									<TableRow>
										<TableCell>
											<div class="flex flex-col">
												<span class="font-medium">{dist.projectName}</span>
												<span class="text-xs text-muted-foreground">{dist.projectCode}</span>
											</div>
										</TableCell>
										<TableCell class="text-right font-medium text-green-600">
											{formatCurrency(dist.projectRevenue)}
										</TableCell>
										<TableCell class="text-right">
											<Badge variant="outline" class="font-mono">
												{dist.revenueSharePercent.toFixed(1)}%
											</Badge>
										</TableCell>
										<TableCell class="text-right text-muted-foreground">
											{formatCurrency(dist.directSalaryCosts)}
										</TableCell>
										<TableCell class="text-right text-muted-foreground">
											{formatCurrency(dist.distributedSalaries)}
										</TableCell>
										<TableCell class="text-right text-muted-foreground">
											{formatCurrency(dist.distributedOverhead)}
										</TableCell>
										<TableCell class="text-right font-semibold">
											{formatCurrency(dist.totalDistributed)}
										</TableCell>
									</TableRow>
								{/each}
								<!-- Totals Row -->
								<TableRow class="bg-muted/50 font-semibold">
									<TableCell>Total</TableCell>
									<TableCell class="text-right text-green-600">
										{formatCurrency(totals.revenue)}
									</TableCell>
									<TableCell class="text-right">
										<Badge variant="outline" class="font-mono">100%</Badge>
									</TableCell>
									<TableCell class="text-right">
										{formatCurrency(totals.directSalaryCosts)}
									</TableCell>
									<TableCell class="text-right">
										{formatCurrency(totals.nonProductive)}
									</TableCell>
									<TableCell class="text-right">
										{formatCurrency(totals.overhead)}
									</TableCell>
									<TableCell class="text-right">
										{formatCurrency(totals.directSalaryCosts + totals.nonProductive + totals.overhead)}
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</ScrollArea>
				{/if}
			{/if}
		</CardContent>
	</Card>
</div>

<CloseMonthDialog
	bind:open={closeDialogOpen}
	{year}
	{month}
	preview={previewData}
	onSuccess={handleCloseSuccess}
/>

<ReopenMonthDialog bind:open={reopenDialogOpen} {year} {month} onSuccess={handleReopenSuccess} />

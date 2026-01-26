<script lang="ts">
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
		AlertDialog,
		AlertDialogAction,
		AlertDialogCancel,
		AlertDialogContent,
		AlertDialogDescription,
		AlertDialogFooter,
		AlertDialogHeader,
		AlertDialogTitle
	} from '$lib/components/ui/alert-dialog';
	import {
		fetchMonthlyOverhead,
		deleteOverheadCost,
		OVERHEAD_COST_TYPE_LABELS,
		type OverheadCost,
		type MonthlyOverheadResponse,
		type MonthClosingStatus
	} from '$lib/api/month-closing';
	import { formatCurrency } from '$lib/api/costs';
	import OverheadCostDialog from './OverheadCostDialog.svelte';

	type Props = {
		year: number;
		month: number;
		monthStatus: MonthClosingStatus;
		onStatusChange?: (newStatus: MonthClosingStatus) => void;
	};

	let { year, month, monthStatus, onStatusChange }: Props = $props();

	let loading = $state(true);
	let error = $state<string | null>(null);
	let data = $state<MonthlyOverheadResponse | null>(null);

	let dialogOpen = $state(false);
	let selectedCost = $state<OverheadCost | null>(null);

	let deleteDialogOpen = $state(false);
	let costToDelete = $state<OverheadCost | null>(null);
	let deleting = $state(false);
	let deleteError = $state<string | null>(null);

	// Track year/month changes
	let currentYear = $state(year);
	let currentMonth = $state(month);

	$effect(() => {
		if (year !== currentYear || month !== currentMonth) {
			currentYear = year;
			currentMonth = month;
			loadData();
		}
	});

	async function loadData() {
		loading = true;
		error = null;
		try {
			data = await fetchMonthlyOverhead(year, month);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar gastos generales';
		} finally {
			loading = false;
		}
	}

	function handleAdd() {
		selectedCost = null;
		dialogOpen = true;
	}

	function handleEdit(cost: OverheadCost) {
		selectedCost = cost;
		dialogOpen = true;
	}

	function handleDeleteClick(cost: OverheadCost) {
		costToDelete = cost;
		deleteError = null;
		deleteDialogOpen = true;
	}

	async function handleDelete() {
		if (!costToDelete || deleting) return;

		deleting = true;
		deleteError = null;

		try {
			await deleteOverheadCost(costToDelete.id);
			deleteDialogOpen = false;
			costToDelete = null;
			await loadData();
		} catch (e) {
			deleteError = e instanceof Error ? e.message : 'Error al eliminar';
		} finally {
			deleting = false;
		}
	}

	function handleDialogClose() {
		selectedCost = null;
	}

	async function handleSaveSuccess(warning?: string) {
		if (warning) {
			onStatusChange?.('REOPENED');
		}
		await loadData();
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('es-ES', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	// Load data on mount
	$effect(() => {
		loadData();
	});
</script>

<Card>
	<CardHeader>
		<div class="flex items-center justify-between">
			<div>
				<CardTitle class="text-lg">Gastos Generales</CardTitle>
				<p class="text-sm text-muted-foreground mt-1">
					Gastos de estructura distribuidos entre proyectos activos
				</p>
			</div>
			<div class="flex items-center gap-3">
				{#if data && !loading}
					<div class="text-right">
						<div class="text-sm text-muted-foreground">Total Gastos</div>
						<div class="text-xl font-bold text-red-600">
							{formatCurrency(data.total)}
						</div>
					</div>
				{/if}
				<Button size="sm" onclick={handleAdd} disabled={loading}>
					<span class="material-symbols-rounded text-lg! mr-1">add</span>
					Añadir Gasto
				</Button>
			</div>
		</div>
	</CardHeader>
	<CardContent>
		{#if loading}
			<div class="space-y-3">
				{#each Array.from({ length: 4 }) as _, i (i)}
					<div class="flex items-center gap-4">
						<Skeleton class="h-10 w-32" />
						<Skeleton class="h-10 w-24" />
						<Skeleton class="h-10 w-40" />
						<Skeleton class="h-10 w-20" />
					</div>
				{/each}
			</div>
		{:else if error}
			<div class="flex flex-col items-center justify-center py-8 text-destructive">
				<span class="material-symbols-rounded text-3xl! mb-2">error</span>
				<p>{error}</p>
				<Button variant="outline" size="sm" class="mt-4" onclick={loadData}>
					<span class="material-symbols-rounded mr-1 text-lg!">refresh</span>
					Reintentar
				</Button>
			</div>
		{:else if !data || data.costs.length === 0}
			<div
				class="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg border-dashed"
			>
				<span class="material-symbols-rounded text-4xl! mb-2">receipt_long</span>
				<p class="mb-2">No hay gastos generales registrados</p>
				<Button variant="ghost" size="sm" onclick={handleAdd}>
					<span class="material-symbols-rounded mr-1 text-lg!">add</span>
					Añadir primer gasto
				</Button>
			</div>
		{:else}
			<ScrollArea class="max-h-[500px]">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Tipo</TableHead>
							<TableHead class="text-right">Importe</TableHead>
							<TableHead>Descripción</TableHead>
							<TableHead>Fecha</TableHead>
							<TableHead class="w-[100px]">Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each data.costs as cost (cost.id)}
							<TableRow>
								<TableCell>
									<Badge variant="outline" class="font-normal">
										{OVERHEAD_COST_TYPE_LABELS[cost.costType]}
									</Badge>
								</TableCell>
								<TableCell class="text-right font-medium text-red-600">
									{formatCurrency(cost.amount)}
								</TableCell>
								<TableCell class="max-w-[200px]">
									{#if cost.description}
										<span class="text-muted-foreground truncate block">
											{cost.description}
										</span>
									{:else}
										<span class="text-muted-foreground">—</span>
									{/if}
								</TableCell>
								<TableCell class="text-muted-foreground text-sm">
									{formatDate(cost.createdAt)}
								</TableCell>
								<TableCell>
									<div class="flex items-center gap-1">
										<Button
											variant="ghost"
											size="sm"
											class="h-8 w-8 p-0"
											onclick={() => handleEdit(cost)}
										>
											<span class="material-symbols-rounded text-lg!">edit</span>
											<span class="sr-only">Editar</span>
										</Button>
										<Button
											variant="ghost"
											size="sm"
											class="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
											onclick={() => handleDeleteClick(cost)}
										>
											<span class="material-symbols-rounded text-lg!">delete</span>
											<span class="sr-only">Eliminar</span>
										</Button>
									</div>
								</TableCell>
							</TableRow>
						{/each}
						<!-- Totals Row -->
						<TableRow class="bg-muted/50 font-semibold">
							<TableCell>Total</TableCell>
							<TableCell class="text-right text-red-600">
								{formatCurrency(data.total)}
							</TableCell>
							<TableCell></TableCell>
							<TableCell></TableCell>
							<TableCell></TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</ScrollArea>
		{/if}
	</CardContent>
</Card>

<OverheadCostDialog
	bind:open={dialogOpen}
	cost={selectedCost}
	{year}
	{month}
	{monthStatus}
	onSave={handleSaveSuccess}
	onClose={handleDialogClose}
/>

<AlertDialog bind:open={deleteDialogOpen}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
			<AlertDialogDescription>
				Esta acción no se puede deshacer. Se eliminará el gasto de
				<strong>{formatCurrency(costToDelete?.amount ?? 0)}</strong>
				({costToDelete ? OVERHEAD_COST_TYPE_LABELS[costToDelete.costType] : ''}).
			</AlertDialogDescription>
		</AlertDialogHeader>
		{#if deleteError}
			<div class="text-sm text-destructive">{deleteError}</div>
		{/if}
		<AlertDialogFooter>
			<AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
			<AlertDialogAction
				onclick={handleDelete}
				disabled={deleting}
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
			>
				{#if deleting}
					<span class="material-symbols-rounded animate-spin text-lg! mr-2">progress_activity</span>
				{/if}
				Eliminar
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>

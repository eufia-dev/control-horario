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
		createCostActual,
		updateCostActual,
		deleteCostActual,
		formatCurrency,
		EXPENSE_TYPE_LABELS,
		type CostActual,
		type CreateCostActualDto,
		type UpdateCostActualDto,
		type CreateCostEstimateDto,
		type UpdateCostEstimateDto
	} from '$lib/api/cash-flow';
	import CostItemDialog from './CostItemDialog.svelte';

	type Props = {
		projectId: string;
		year: number;
		month: number;
		actuals: CostActual[];
		onChange: () => void;
	};

	let { projectId, year, month, actuals, onChange }: Props = $props();

	let dialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let selectedActual = $state<CostActual | null>(null);
	let deleting = $state(false);
	let deleteError = $state<string | null>(null);

	const totalActual = $derived(actuals.reduce((sum, a) => sum + a.amount, 0));

	function formatDate(dateString: string | null): string {
		if (!dateString) return '—';
		const date = new Date(dateString);
		return date.toLocaleDateString('es-ES', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function handleAdd() {
		selectedActual = null;
		dialogOpen = true;
	}

	function handleEdit(actual: CostActual) {
		selectedActual = actual;
		dialogOpen = true;
	}

	function handleDeleteClick(actual: CostActual) {
		selectedActual = actual;
		deleteError = null;
		deleteDialogOpen = true;
	}

	async function handleDelete() {
		if (!selectedActual || deleting) return;

		deleting = true;
		deleteError = null;

		try {
			await deleteCostActual(selectedActual.id);
			deleteDialogOpen = false;
			selectedActual = null;
			onChange();
		} catch (e) {
			deleteError = e instanceof Error ? e.message : 'Error al eliminar';
		} finally {
			deleting = false;
		}
	}

	async function handleSave(data: CreateCostEstimateDto | UpdateCostEstimateDto | CreateCostActualDto | UpdateCostActualDto) {
		const actualData = data as CreateCostActualDto | UpdateCostActualDto;
		if (selectedActual) {
			// Update
			await updateCostActual(selectedActual.id, actualData as UpdateCostActualDto);
		} else {
			// Create
			await createCostActual(projectId, {
				year,
				month,
				...actualData
			} as CreateCostActualDto);
		}
		onChange();
	}

	function handleDialogClose() {
		selectedActual = null;
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<div>
			<h3 class="text-sm font-semibold">Costes Reales</h3>
			<p class="text-xs text-muted-foreground">
				Total real: <span class="font-medium">{formatCurrency(totalActual)}</span>
			</p>
		</div>
		<Button size="sm" onclick={handleAdd}>
			<span class="material-symbols-rounded text-lg! mr-1">add</span>
			Añadir
		</Button>
	</div>

	{#if actuals.length === 0}
		<div class="flex flex-col items-center justify-center py-6 text-muted-foreground border rounded-lg border-dashed">
			<span class="material-symbols-rounded text-3xl! mb-2">receipt_long</span>
			<p class="text-sm">No hay costes reales registrados</p>
			<Button variant="ghost" size="sm" class="mt-2" onclick={handleAdd}>
				<span class="material-symbols-rounded mr-1 text-lg!">add</span>
				Añadir primer coste
			</Button>
		</div>
	{:else}
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Proveedor</TableHead>
					<TableHead>Tipo</TableHead>
					<TableHead>Importe</TableHead>
					<TableHead>Facturado</TableHead>
					<TableHead>Vencimiento</TableHead>
					<TableHead class="w-[80px]">Acciones</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{#each actuals as actual (actual.id)}
					<TableRow>
						<TableCell class="font-medium">{actual.provider}</TableCell>
						<TableCell>
							<Badge variant="outline" class="text-xs">
								{EXPENSE_TYPE_LABELS[actual.expenseType]}
							</Badge>
						</TableCell>
						<TableCell>{formatCurrency(actual.amount)}</TableCell>
						<TableCell>
							{#if actual.isBilled}
								<Badge variant="success" class="text-xs">
									<span class="material-symbols-rounded text-sm! mr-1">check_circle</span>
									Facturado
								</Badge>
							{:else}
								<Badge variant="secondary" class="text-xs">
									<span class="material-symbols-rounded text-sm! mr-1">schedule</span>
									Pendiente
								</Badge>
							{/if}
						</TableCell>
						<TableCell class="text-muted-foreground">
							{formatDate(actual.dueDate)}
						</TableCell>
						<TableCell>
							<div class="flex items-center gap-1">
								<Button
									variant="ghost"
									size="sm"
									class="h-8 w-8 p-0"
									onclick={() => handleEdit(actual)}
								>
									<span class="material-symbols-rounded text-lg!">edit</span>
									<span class="sr-only">Editar</span>
								</Button>
								<Button
									variant="ghost"
									size="sm"
									class="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
									onclick={() => handleDeleteClick(actual)}
								>
									<span class="material-symbols-rounded text-lg!">delete</span>
									<span class="sr-only">Eliminar</span>
								</Button>
							</div>
						</TableCell>
					</TableRow>
				{/each}
			</TableBody>
		</Table>
	{/if}
</div>

<CostItemDialog
	bind:open={dialogOpen}
	mode="actual"
	item={selectedActual}
	onSave={handleSave}
	onClose={handleDialogClose}
/>

<AlertDialog bind:open={deleteDialogOpen}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>¿Eliminar coste?</AlertDialogTitle>
			<AlertDialogDescription>
				Esta acción no se puede deshacer. Se eliminará el coste de {formatCurrency(
					selectedActual?.amount ?? 0
				)} de {selectedActual?.provider ?? 'este proveedor'}.
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

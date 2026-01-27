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
		createCostEstimate,
		updateCostEstimate,
		deleteCostEstimate,
		formatCurrency,
		type CostEstimate,
		type CreateCostEstimateDto,
		type UpdateCostEstimateDto,
		type CreateCostActualDto,
		type UpdateCostActualDto
	} from '$lib/api/costs';
	import CostItemDialog from './CostItemDialog.svelte';

	type Props = {
		projectId: string;
		year: number;
		month: number;
		estimates: CostEstimate[];
		onChange: () => void;
	};

	let { projectId, year, month, estimates, onChange }: Props = $props();

	let dialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let selectedEstimate = $state<CostEstimate | null>(null);
	let deleting = $state(false);
	let deleteError = $state<string | null>(null);

	const totalEstimated = $derived(estimates.reduce((sum, e) => sum + e.amount, 0));

	function handleAdd() {
		selectedEstimate = null;
		dialogOpen = true;
	}

	function handleEdit(estimate: CostEstimate) {
		selectedEstimate = estimate;
		dialogOpen = true;
	}

	function handleDeleteClick(estimate: CostEstimate) {
		selectedEstimate = estimate;
		deleteError = null;
		deleteDialogOpen = true;
	}

	async function handleDelete() {
		if (!selectedEstimate || deleting) return;

		deleting = true;
		deleteError = null;

		try {
			await deleteCostEstimate(selectedEstimate.id);
			deleteDialogOpen = false;
			selectedEstimate = null;
			onChange();
		} catch (e) {
			deleteError = e instanceof Error ? e.message : 'Error al eliminar';
		} finally {
			deleting = false;
		}
	}

	async function handleSave(
		data: CreateCostEstimateDto | UpdateCostEstimateDto | CreateCostActualDto | UpdateCostActualDto
	) {
		const estimateData = data as CreateCostEstimateDto | UpdateCostEstimateDto;
		if (selectedEstimate) {
			// Update
			await updateCostEstimate(selectedEstimate.id, estimateData as UpdateCostEstimateDto);
		} else {
			// Create
			await createCostEstimate(projectId, {
				year,
				month,
				...estimateData
			} as CreateCostEstimateDto);
		}
		onChange();
	}

	function handleDialogClose() {
		selectedEstimate = null;
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<div>
			<h3 class="text-sm font-semibold">Estimaciones de Coste</h3>
			<p class="text-xs text-muted-foreground">
				Total estimado: <span class="font-medium">{formatCurrency(totalEstimated)}</span>
			</p>
		</div>
		<Button size="sm" onclick={handleAdd}>
			<span class="material-symbols-rounded text-lg! mr-1">add</span>
			Añadir
		</Button>
	</div>

	{#if estimates.length === 0}
		<div
			class="flex flex-col items-center justify-center py-6 text-muted-foreground border rounded-lg border-dashed"
		>
			<span class="material-symbols-rounded text-3xl! mb-2">receipt</span>
			<p class="text-sm">No hay estimaciones de coste</p>
			<Button variant="ghost" size="sm" class="mt-2" onclick={handleAdd}>
				<span class="material-symbols-rounded mr-1 text-lg!">add</span>
				Añadir primera estimación
			</Button>
		</div>
	{:else}
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Importe</TableHead>
					<TableHead>Proveedor</TableHead>
					<TableHead>Descripción</TableHead>
					<TableHead class="w-[80px]">Acciones</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{#each estimates as estimate (estimate.id)}
					<TableRow>
						<TableCell class="font-medium">{formatCurrency(estimate.amount)}</TableCell>
						<TableCell>{estimate.provider?.name ?? '—'}</TableCell>
						<TableCell class="max-w-[150px] truncate text-muted-foreground">
							{estimate.description ?? '—'}
						</TableCell>
						<TableCell>
							<div class="flex items-center gap-1">
								<Button
									variant="ghost"
									size="sm"
									class="h-8 w-8 p-0"
									onclick={() => handleEdit(estimate)}
								>
									<span class="material-symbols-rounded text-lg!">edit</span>
									<span class="sr-only">Editar</span>
								</Button>
								<Button
									variant="ghost"
									size="sm"
									class="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
									onclick={() => handleDeleteClick(estimate)}
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
	mode="estimate"
	item={selectedEstimate}
	onSave={handleSave}
	onClose={handleDialogClose}
/>

<AlertDialog bind:open={deleteDialogOpen}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>¿Eliminar estimación?</AlertDialogTitle>
			<AlertDialogDescription>
				Esta acción no se puede deshacer. Se eliminará la estimación de coste de {formatCurrency(
					selectedEstimate?.amount ?? 0
				)}.
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

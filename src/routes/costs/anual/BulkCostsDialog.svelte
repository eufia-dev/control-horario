<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
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
		createCostEstimate,
		updateCostEstimate,
		deleteCostEstimate,
		createCostActual,
		updateCostActual,
		deleteCostActual,
		formatCurrency,
		getMonthName,
		type CostEstimate,
		type CostActual,
		type CreateCostEstimateDto,
		type UpdateCostEstimateDto,
		type CreateCostActualDto,
		type UpdateCostActualDto
	} from '$lib/api/costs';
	import CostItemDialog from '../CostItemDialog.svelte';

	type Props = {
		open: boolean;
		projectId: string;
		projectName: string;
		year: number;
		month: number;
		estimatedCosts: CostEstimate[];
		actualCosts: CostActual[];
		initialTab?: 'estimates' | 'actuals';
		onClose: () => void;
		onDataChange: () => void;
	};

	let {
		open = $bindable(),
		projectId,
		projectName,
		year,
		month,
		estimatedCosts,
		actualCosts,
		initialTab = 'estimates',
		onClose,
		onDataChange
	}: Props = $props();

	let activeTab = $state<'estimates' | 'actuals'>('estimates');
	let itemDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let selectedEstimate = $state<CostEstimate | null>(null);
	let selectedActual = $state<CostActual | null>(null);
	let itemDialogMode = $state<'estimate' | 'actual'>('estimate');
	let deleting = $state(false);
	let deleteError = $state<string | null>(null);

	const monthName = $derived(getMonthName(month));
	const totalEstimated = $derived(estimatedCosts.reduce((sum, e) => sum + e.amount, 0));
	const totalActual = $derived(actualCosts.reduce((sum, a) => sum + a.amount, 0));

	// Reset state when dialog opens
	$effect(() => {
		if (open) {
			// Capture initialTab when dialog opens
			activeTab = initialTab;
		}
	});

	function handleAddEstimate() {
		selectedEstimate = null;
		selectedActual = null;
		itemDialogMode = 'estimate';
		itemDialogOpen = true;
	}

	function handleEditEstimate(estimate: CostEstimate) {
		selectedEstimate = estimate;
		selectedActual = null;
		itemDialogMode = 'estimate';
		itemDialogOpen = true;
	}

	function handleDeleteEstimateClick(estimate: CostEstimate) {
		selectedEstimate = estimate;
		selectedActual = null;
		deleteError = null;
		deleteDialogOpen = true;
	}

	function handleAddActual() {
		selectedActual = null;
		selectedEstimate = null;
		itemDialogMode = 'actual';
		itemDialogOpen = true;
	}

	function handleEditActual(actual: CostActual) {
		selectedActual = actual;
		selectedEstimate = null;
		itemDialogMode = 'actual';
		itemDialogOpen = true;
	}

	function handleDeleteActualClick(actual: CostActual) {
		selectedActual = actual;
		selectedEstimate = null;
		deleteError = null;
		deleteDialogOpen = true;
	}

	async function handleDelete() {
		if (deleting) return;

		deleting = true;
		deleteError = null;

		try {
			if (selectedEstimate) {
				await deleteCostEstimate(selectedEstimate.id);
			} else if (selectedActual) {
				await deleteCostActual(selectedActual.id);
			}
			deleteDialogOpen = false;
			selectedEstimate = null;
			selectedActual = null;
			onDataChange();
		} catch (e) {
			deleteError = e instanceof Error ? e.message : 'Error al eliminar';
		} finally {
			deleting = false;
		}
	}

	async function handleSave(
		data: CreateCostEstimateDto | UpdateCostEstimateDto | CreateCostActualDto | UpdateCostActualDto
	) {
		if (itemDialogMode === 'estimate') {
			const estimateData = data as CreateCostEstimateDto | UpdateCostEstimateDto;
			if (selectedEstimate) {
				await updateCostEstimate(selectedEstimate.id, estimateData as UpdateCostEstimateDto);
			} else {
				await createCostEstimate(projectId, {
					year,
					month,
					...estimateData
				} as CreateCostEstimateDto);
			}
		} else {
			const actualData = data as CreateCostActualDto | UpdateCostActualDto;
			if (selectedActual) {
				await updateCostActual(selectedActual.id, actualData as UpdateCostActualDto);
			} else {
				await createCostActual(projectId, {
					year,
					month,
					...actualData
				} as CreateCostActualDto);
			}
		}
		onDataChange();
	}

	function handleItemDialogClose() {
		selectedEstimate = null;
		selectedActual = null;
	}

	function handleClose() {
		open = false;
		onClose();
	}

	function getDeleteDescription(): string {
		if (selectedEstimate) {
			return `Se eliminará la estimación de coste de ${formatCurrency(selectedEstimate.amount)}.`;
		} else if (selectedActual) {
			return `Se eliminará el coste de ${formatCurrency(selectedActual.amount)} de ${selectedActual.provider?.name ?? 'proveedor desconocido'}.`;
		}
		return '';
	}
</script>

<Dialog bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<DialogContent class="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2">
				<span class="material-symbols-rounded text-xl!">receipt_long</span>
				Costes - {projectName}
			</DialogTitle>
			<DialogDescription>
				{monthName}
				{year}
			</DialogDescription>
		</DialogHeader>

		<Tabs bind:value={activeTab} class="flex-1 flex flex-col overflow-hidden">
			<TabsList class="w-full grid grid-cols-2">
				<TabsTrigger value="estimates" class="gap-1.5">
					<span class="material-symbols-rounded text-lg!">receipt</span>
					<span>Estimaciones</span>
					<Badge variant="secondary" class="ml-1 text-xs">{estimatedCosts.length}</Badge>
				</TabsTrigger>
				<TabsTrigger value="actuals" class="gap-1.5">
					<span class="material-symbols-rounded text-lg!">receipt_long</span>
					<span>Reales</span>
					<Badge variant="secondary" class="ml-1 text-xs">{actualCosts.length}</Badge>
				</TabsTrigger>
			</TabsList>

			<!-- Estimates Tab -->
			<TabsContent value="estimates" class="flex-1 overflow-auto mt-4">
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm text-muted-foreground">
								Total estimado: <span class="font-semibold text-foreground"
									>{formatCurrency(totalEstimated)}</span
								>
							</p>
						</div>
						<Button size="sm" onclick={handleAddEstimate}>
							<span class="material-symbols-rounded text-lg! mr-1">add</span>
							Añadir
						</Button>
					</div>

					{#if estimatedCosts.length === 0}
						<div
							class="flex flex-col items-center justify-center py-8 text-muted-foreground border rounded-lg border-dashed"
						>
							<span class="material-symbols-rounded text-3xl! mb-2">receipt</span>
							<p class="text-sm">No hay estimaciones de coste</p>
							<Button variant="ghost" size="sm" class="mt-2" onclick={handleAddEstimate}>
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
									<TableHead class="w-[80px]">Acciones</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#each estimatedCosts as estimate (estimate.id)}
									<TableRow>
										<TableCell class="font-medium">{formatCurrency(estimate.amount)}</TableCell>
										<TableCell>{estimate.provider?.name ?? '—'}</TableCell>
										<TableCell>
											<div class="flex items-center gap-1">
												<Button
													variant="ghost"
													size="sm"
													class="h-8 w-8 p-0"
													onclick={() => handleEditEstimate(estimate)}
												>
													<span class="material-symbols-rounded text-lg!">edit</span>
													<span class="sr-only">Editar</span>
												</Button>
												<Button
													variant="ghost"
													size="sm"
													class="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
													onclick={() => handleDeleteEstimateClick(estimate)}
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
			</TabsContent>

			<!-- Actuals Tab -->
			<TabsContent value="actuals" class="flex-1 overflow-auto mt-4">
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm text-muted-foreground">
								Total real: <span class="font-semibold text-foreground"
									>{formatCurrency(totalActual)}</span
								>
							</p>
						</div>
						<Button size="sm" onclick={handleAddActual}>
							<span class="material-symbols-rounded text-lg! mr-1">add</span>
							Añadir
						</Button>
					</div>

					{#if actualCosts.length === 0}
						<div
							class="flex flex-col items-center justify-center py-8 text-muted-foreground border rounded-lg border-dashed"
						>
							<span class="material-symbols-rounded text-3xl! mb-2">receipt_long</span>
							<p class="text-sm">No hay costes reales registrados</p>
							<Button variant="ghost" size="sm" class="mt-2" onclick={handleAddActual}>
								<span class="material-symbols-rounded mr-1 text-lg!">add</span>
								Añadir primer coste
							</Button>
						</div>
					{:else}
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Importe</TableHead>
									<TableHead>Proveedor</TableHead>
									<TableHead>Facturado</TableHead>
									<TableHead class="w-[80px]">Acciones</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#each actualCosts as actual (actual.id)}
									<TableRow>
										<TableCell class="font-medium">{formatCurrency(actual.amount)}</TableCell>
										<TableCell>{actual.provider?.name ?? '—'}</TableCell>
										<TableCell>
											{#if actual.isBilled}
												<Badge variant="success" class="text-xs">
													<span class="material-symbols-rounded text-sm! mr-0.5">check_circle</span>
													Sí
												</Badge>
											{:else}
												<Badge variant="secondary" class="text-xs">
													<span class="material-symbols-rounded text-sm! mr-0.5">schedule</span>
													No
												</Badge>
											{/if}
										</TableCell>
										<TableCell>
											<div class="flex items-center gap-1">
												<Button
													variant="ghost"
													size="sm"
													class="h-8 w-8 p-0"
													onclick={() => handleEditActual(actual)}
												>
													<span class="material-symbols-rounded text-lg!">edit</span>
													<span class="sr-only">Editar</span>
												</Button>
												<Button
													variant="ghost"
													size="sm"
													class="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
													onclick={() => handleDeleteActualClick(actual)}
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
			</TabsContent>
		</Tabs>
	</DialogContent>
</Dialog>

<CostItemDialog
	bind:open={itemDialogOpen}
	mode={itemDialogMode}
	item={itemDialogMode === 'estimate' ? selectedEstimate : selectedActual}
	onSave={handleSave}
	onClose={handleItemDialogClose}
/>

<AlertDialog bind:open={deleteDialogOpen}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>
				{selectedEstimate ? '¿Eliminar estimación?' : '¿Eliminar coste?'}
			</AlertDialogTitle>
			<AlertDialogDescription>
				Esta acción no se puede deshacer. {getDeleteDescription()}
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

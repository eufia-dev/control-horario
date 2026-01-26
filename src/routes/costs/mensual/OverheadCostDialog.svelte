<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
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
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import {
		createOverheadCost,
		updateOverheadCost,
		OVERHEAD_COST_TYPE_LABELS,
		type OverheadCost,
		type OverheadCostType,
		type MonthClosingStatus
	} from '$lib/api/month-closing';

	type Props = {
		open: boolean;
		cost: OverheadCost | null;
		year: number;
		month: number;
		monthStatus: MonthClosingStatus;
		onSave: (warning?: string) => Promise<void>;
		onClose: () => void;
	};

	let { open = $bindable(), cost, year, month, monthStatus, onSave, onClose }: Props = $props();

	// Form state
	let amount = $state<number | null>(null);
	let costType = $state<OverheadCostType | ''>('');
	let description = $state('');

	let submitting = $state(false);
	let success = $state(false);
	let error = $state<string | null>(null);

	// Confirm dialog for editing closed month
	let confirmDialogOpen = $state(false);
	let pendingSubmit = $state(false);

	const isEditMode = $derived(cost !== null);

	const dialogTitle = $derived(isEditMode ? 'Editar Gasto General' : 'Nuevo Gasto General');
	const dialogDescription = $derived(
		isEditMode
			? 'Modifica los datos del gasto general.'
			: 'Añade un nuevo gasto de estructura para distribuir entre proyectos.'
	);

	const costTypeOptions = Object.entries(OVERHEAD_COST_TYPE_LABELS).map(([value, label]) => ({
		value: value as OverheadCostType,
		label
	}));

	const selectedCostTypeLabel = $derived(
		costType ? OVERHEAD_COST_TYPE_LABELS[costType] : 'Seleccionar tipo'
	);

	function resetForm() {
		amount = null;
		costType = '';
		description = '';
		error = null;
		success = false;
	}

	function populateForm() {
		if (cost) {
			amount = cost.amount;
			costType = cost.costType;
			description = cost.description ?? '';
		} else {
			resetForm();
		}
	}

	async function handleSubmit(e?: SubmitEvent) {
		e?.preventDefault();
		if (submitting || success) return;

		// If month is closed, show confirmation dialog first
		if (monthStatus === 'CLOSED' && !pendingSubmit) {
			confirmDialogOpen = true;
			return;
		}

		pendingSubmit = false;
		error = null;

		// Validation
		if (amount === null || amount <= 0) {
			error = 'El importe debe ser mayor que 0';
			return;
		}

		if (!costType) {
			error = 'El tipo de gasto es obligatorio';
			return;
		}

		submitting = true;

		try {
			let warning: string | undefined;

			if (isEditMode && cost) {
				const result = await updateOverheadCost(cost.id, {
					amount,
					costType: costType as OverheadCostType,
					description: description.trim() || undefined
				});
				warning = result.warning;
			} else {
				const result = await createOverheadCost({
					year,
					month,
					amount,
					costType: costType as OverheadCostType,
					description: description.trim() || undefined
				});
				warning = result.warning;
			}

			success = true;
			setTimeout(async () => {
				open = false;
				await onSave(warning);
				onClose();
			}, 800);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al guardar';
		} finally {
			submitting = false;
		}
	}

	function handleConfirmEdit() {
		confirmDialogOpen = false;
		pendingSubmit = true;
		handleSubmit();
	}

	function handleClose() {
		open = false;
		onClose();
	}

	$effect(() => {
		if (open) {
			populateForm();
		}
	});

	$effect(() => {
		if (!open) {
			resetForm();
			pendingSubmit = false;
		}
	});
</script>

<Dialog bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>{dialogTitle}</DialogTitle>
			<DialogDescription>{dialogDescription}</DialogDescription>
		</DialogHeader>

		<form onsubmit={handleSubmit} class="grid gap-4 py-4">
			<div class="grid gap-2">
				<Label>Tipo de Gasto *</Label>
				<Select type="single" bind:value={costType} disabled={submitting}>
					<SelectTrigger class="w-full">
						{selectedCostTypeLabel}
					</SelectTrigger>
					<SelectContent>
						{#each costTypeOptions as option (option.value)}
							<SelectItem value={option.value} label={option.label} />
						{/each}
					</SelectContent>
				</Select>
			</div>

			<div class="grid gap-2">
				<Label for="amount">Importe (€) *</Label>
				<Input
					id="amount"
					type="number"
					min="0"
					step="0.01"
					bind:value={amount}
					placeholder="0,00"
					disabled={submitting}
				/>
			</div>

			<div class="grid gap-2">
				<Label for="description">Descripción</Label>
				<Textarea
					id="description"
					bind:value={description}
					placeholder="Descripción del gasto..."
					disabled={submitting}
					rows={2}
				/>
			</div>

			{#if error}
				<div class="text-sm text-destructive flex items-center gap-1">
					<span class="material-symbols-rounded text-sm!">error</span>
					{error}
				</div>
			{/if}

			<DialogFooter class="gap-2">
				<Button
					type="button"
					variant="outline"
					onclick={handleClose}
					disabled={submitting || success}
				>
					Cancelar
				</Button>
				<Button
					type="submit"
					variant={success ? 'success' : 'default'}
					disabled={submitting || success}
					class="min-w-22"
				>
					{#if submitting}
						<span class="material-symbols-rounded animate-spin text-lg!">progress_activity</span>
					{:else if success}
						<span class="material-symbols-rounded text-lg! animate-in zoom-in duration-200"
							>check_circle</span
						>
						Guardado
					{:else}
						Guardar
					{/if}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

<!-- Confirmation dialog for editing closed month -->
<AlertDialog bind:open={confirmDialogOpen}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>Mes cerrado</AlertDialogTitle>
			<AlertDialogDescription>
				Este mes está cerrado. Los cambios recalcularán la distribución de costes y el mes pasará
				a estado "Reabierto". ¿Deseas continuar?
			</AlertDialogDescription>
		</AlertDialogHeader>
		<AlertDialogFooter>
			<AlertDialogCancel>Cancelar</AlertDialogCancel>
			<AlertDialogAction onclick={handleConfirmEdit}>Continuar</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>

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
	import {
		upsertMonthlySalary,
		type UserMonthlySalary,
		type MonthClosingStatus
	} from '$lib/api/month-closing';
	import { formatCurrency } from '$lib/api/costs';

	type Props = {
		open: boolean;
		user: UserMonthlySalary | null;
		year: number;
		month: number;
		monthStatus: MonthClosingStatus;
		onSave: (warning?: string) => Promise<void>;
		onClose: () => void;
	};

	let { open = $bindable(), user, year, month, monthStatus, onSave, onClose }: Props = $props();

	// Form state
	let baseSalary = $state<number | null>(null);
	let extras = $state<number>(0);
	let notes = $state('');

	let submitting = $state(false);
	let success = $state(false);
	let error = $state<string | null>(null);

	// Confirm dialog for editing closed month
	let confirmDialogOpen = $state(false);
	let pendingSubmit = $state(false);

	const isBaseSalaryChanged = $derived(
		baseSalary !== null && user?.baseSalary !== null && baseSalary !== user?.baseSalary
	);

	const computedTotal = $derived(() => {
		if (baseSalary === null) return null;
		return baseSalary + (extras || 0);
	});

	function resetForm() {
		baseSalary = null;
		extras = 0;
		notes = '';
		error = null;
		success = false;
	}

	function populateForm() {
		if (user) {
			baseSalary = user.baseSalary;
			extras = user.extras || 0;
			notes = user.notes || '';
		} else {
			resetForm();
		}
	}

	async function handleSubmit(e?: SubmitEvent) {
		e?.preventDefault();
		if (submitting || success || !user) return;

		// If month is closed, show confirmation dialog first
		if (monthStatus === 'CLOSED' && !pendingSubmit) {
			confirmDialogOpen = true;
			return;
		}

		pendingSubmit = false;
		error = null;
		submitting = true;

		try {
			const result = await upsertMonthlySalary({
				userId: user.userId,
				year,
				month,
				baseSalary: baseSalary ?? undefined,
				extras: extras || 0,
				notes: notes.trim() || undefined
			});

			success = true;
			setTimeout(async () => {
				open = false;
				await onSave(result.warning);
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
			<DialogTitle>Editar Salario</DialogTitle>
			<DialogDescription>
				{#if user}
					Configura el salario de <strong>{user.userName}</strong> para este mes.
				{/if}
			</DialogDescription>
		</DialogHeader>

		<form onsubmit={handleSubmit} class="grid gap-4 py-4">
			<div class="grid gap-2">
				<Label for="baseSalary">Salario Base (€/mes)</Label>
				<Input
					id="baseSalary"
					type="number"
					min="0"
					step="0.01"
					bind:value={baseSalary}
					placeholder="0,00"
					disabled={submitting}
				/>
				{#if isBaseSalaryChanged}
					<p class="text-xs text-amber-600 flex items-center gap-1">
						<span class="material-symbols-rounded text-sm!">info</span>
						El cambio actualizará el salario base del empleado y su coste por hora.
					</p>
				{/if}
			</div>

			<div class="grid gap-2">
				<Label for="extras">Extras (€)</Label>
				<Input
					id="extras"
					type="number"
					min="0"
					step="0.01"
					bind:value={extras}
					placeholder="0,00"
					disabled={submitting}
				/>
				<p class="text-xs text-muted-foreground">Bonificaciones, comisiones, horas extra, etc.</p>
			</div>

			<div class="grid gap-2">
				<Label for="notes">Notas</Label>
				<Textarea
					id="notes"
					bind:value={notes}
					placeholder="Notas adicionales..."
					disabled={submitting}
					rows={2}
				/>
			</div>

			<!-- Computed Total -->
			<div class="p-3 bg-muted rounded-lg">
				<div class="flex items-center justify-between">
					<span class="text-sm text-muted-foreground">Total Mensual</span>
					<span class="text-lg font-semibold">
						{computedTotal() !== null ? formatCurrency(computedTotal()) : '—'}
					</span>
				</div>
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
				Este mes está cerrado. Los cambios recalcularán la distribución de costes y el mes pasará a
				estado "Reabierto". ¿Deseas continuar?
			</AlertDialogDescription>
		</AlertDialogHeader>
		<AlertDialogFooter>
			<AlertDialogCancel>Cancelar</AlertDialogCancel>
			<AlertDialogAction onclick={handleConfirmEdit}>Continuar</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>

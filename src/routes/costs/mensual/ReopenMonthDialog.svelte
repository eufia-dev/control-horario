<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { reopenMonth, type MonthlyClosingResponse } from '$lib/api/month-closing';
	import { getMonthName } from '$lib/api/costs';

	type Props = {
		open: boolean;
		year: number;
		month: number;
		currentReason?: string | null;
		onSuccess: (closingData: MonthlyClosingResponse) => void;
	};

	let { open = $bindable(), year, month, currentReason = null, onSuccess }: Props = $props();

	let reason = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);

	const monthName = $derived(getMonthName(month));
	const isEditing = $derived(!!currentReason);

	async function handleReopen() {
		if (submitting) return;

		// Validation
		if (!reason.trim()) {
			error = 'El motivo es obligatorio';
			return;
		}

		error = null;
		submitting = true;

		try {
			const result = await reopenMonth(year, month, reason.trim());
			open = false;
			onSuccess(result);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al reabrir el mes';
		} finally {
			submitting = false;
		}
	}

	function handleCancel() {
		open = false;
	}

	$effect(() => {
		if (open) {
			reason = currentReason ?? '';
			error = null;
		}
	});

	$effect(() => {
		if (!open) {
			reason = '';
			error = null;
		}
	});
</script>

<Dialog bind:open>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>
				{isEditing ? 'Editar Motivo' : 'Reabrir'} {monthName} {year}
			</DialogTitle>
			<DialogDescription>
				{#if isEditing}
					Actualiza el motivo por el que se reabrió este mes.
				{:else}
					Indica el motivo por el que necesitas reabrir este mes. La distribución de costes
					actual quedará invalidada.
				{/if}
			</DialogDescription>
		</DialogHeader>

		<div class="space-y-4 py-4">
			{#if !isEditing}
				<!-- Warning -->
				<div
					class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg"
				>
					<div class="flex items-start gap-2">
						<span class="material-symbols-rounded text-amber-600 text-lg!">warning</span>
						<div class="text-sm text-amber-800 dark:text-amber-200">
							<p class="font-medium">Atención</p>
							<p class="text-amber-600 dark:text-amber-400 mt-1">
								Al reabrir el mes, la distribución de costes actual quedará invalidada y el mes
								volverá a estado "Reabierto". Necesitarás volver a cerrar el mes cuando termines
								de hacer los cambios.
							</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- Reason Field -->
			<div class="grid gap-2">
				<Label for="reason">Motivo *</Label>
				<Textarea
					id="reason"
					bind:value={reason}
					placeholder="Ej: Corrección de salarios de enero, ajuste de gastos de alquiler..."
					disabled={submitting}
					rows={3}
				/>
				<p class="text-xs text-muted-foreground">
					Indica brevemente por qué necesitas {isEditing ? 'actualizar el motivo' : 'reabrir este mes'}
				</p>
			</div>
		</div>

		{#if error}
			<div class="text-sm text-destructive flex items-center gap-1">
				<span class="material-symbols-rounded text-sm!">error</span>
				{error}
			</div>
		{/if}

		<DialogFooter class="gap-2">
			<Button type="button" variant="outline" onclick={handleCancel} disabled={submitting}>
				Cancelar
			</Button>
			<Button onclick={handleReopen} disabled={submitting} class="min-w-28">
				{#if submitting}
					<span class="material-symbols-rounded animate-spin text-lg! mr-2">progress_activity</span>
					{isEditing ? 'Guardando...' : 'Reabriendo...'}
				{:else}
					<span class="material-symbols-rounded text-lg! mr-1">
						{isEditing ? 'save' : 'lock_open'}
					</span>
					{isEditing ? 'Guardar' : 'Reabrir Mes'}
				{/if}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

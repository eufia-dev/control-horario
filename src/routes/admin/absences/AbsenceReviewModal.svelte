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
	import { Badge } from '$lib/components/ui/badge';
	import { reviewAbsence, type AbsenceResponse } from '$lib/api/absences';
	import { ABSENCE_TYPE_LABELS } from '$lib/types/calendar';

	type Props = {
		open: boolean;
		absence: AbsenceResponse | null;
		onClose: () => void;
		onSuccess: () => void;
	};

	let { open = $bindable(), absence, onClose, onSuccess }: Props = $props();

	let notes = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let action = $state<'APPROVED' | 'REJECTED' | null>(null);

	const typeLabel = $derived(absence ? ABSENCE_TYPE_LABELS[absence.type] || absence.type : '');

	function resetForm() {
		notes = '';
		error = null;
		action = null;
	}

	$effect(() => {
		if (open) {
			resetForm();
		}
	});

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('es-ES', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	function calculateDays(start: string, end: string): number {
		const startDate = new Date(start);
		const endDate = new Date(end);
		const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
	}

	async function handleReview(status: 'APPROVED' | 'REJECTED') {
		if (!absence) return;

		action = status;
		submitting = true;
		error = null;

		try {
			await reviewAbsence(absence.id, {
				status,
				notes: notes.trim() || undefined
			});
			onSuccess();
			handleClose();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al procesar la solicitud';
		} finally {
			submitting = false;
		}
	}

	function handleClose() {
		open = false;
		onClose();
	}

	const days = $derived(absence ? calculateDays(absence.startDate, absence.endDate) : 0);
</script>

<Dialog bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>Revisar Solicitud de Ausencia</DialogTitle>
			<DialogDescription>Aprueba o rechaza esta solicitud de ausencia.</DialogDescription>
		</DialogHeader>

		{#if absence}
			<div class="space-y-4 py-4">
				<!-- Employee Info -->
				<div class="flex items-center gap-3 p-3 bg-muted rounded-lg">
					<span class="material-symbols-rounded text-2xl text-muted-foreground">person</span>
					<div>
						<p class="font-medium">{absence.user?.name || 'Usuario'}</p>
						<p class="text-sm text-muted-foreground">{absence.user?.email}</p>
					</div>
				</div>

				<!-- Absence Details -->
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-sm text-muted-foreground">Tipo</span>
						<Badge variant="secondary">{typeLabel}</Badge>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-muted-foreground">Fechas</span>
						<span class="text-sm font-medium">
							{formatDate(absence.startDate)}
							{#if absence.startDate !== absence.endDate}
								- {formatDate(absence.endDate)}
							{/if}
						</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-muted-foreground">Duración</span>
						<span class="text-sm font-medium">{days} {days === 1 ? 'día' : 'días'}</span>
					</div>
				</div>

				{#if absence.notes}
					<div class="p-3 bg-muted/50 rounded-lg">
						<p class="text-sm text-muted-foreground mb-1">Notas del empleado:</p>
						<p class="text-sm italic">"{absence.notes}"</p>
					</div>
				{/if}

				<!-- Review Notes -->
				<div class="grid gap-2">
					<Label for="review-notes">Comentario (opcional)</Label>
					<Textarea
						id="review-notes"
						bind:value={notes}
						placeholder="Añade un comentario a tu decisión..."
						disabled={submitting}
						rows={2}
					/>
				</div>

				{#if error}
					<div class="text-sm text-destructive">{error}</div>
				{/if}
			</div>

			<DialogFooter class="gap-2 sm:gap-2">
				<Button
					type="button"
					variant="destructive"
					onclick={() => handleReview('REJECTED')}
					disabled={submitting}
					class="flex-1 sm:flex-none"
				>
					{#if submitting && action === 'REJECTED'}
						<span class="material-symbols-rounded animate-spin text-lg!">progress_activity</span>
					{:else}
						<span class="material-symbols-rounded text-lg! mr-2">close</span>
					{/if}
					Rechazar
				</Button>
				<Button
					type="button"
					onclick={() => handleReview('APPROVED')}
					disabled={submitting}
					class="flex-1 sm:flex-none"
				>
					{#if submitting && action === 'APPROVED'}
						<span class="material-symbols-rounded animate-spin text-lg!">progress_activity</span>
					{:else}
						<span class="material-symbols-rounded text-lg! mr-2">check</span>
					{/if}
					Aprobar
				</Button>
			</DialogFooter>
		{/if}
	</DialogContent>
</Dialog>

<script lang="ts">
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
	import { cancelAbsence, type AbsenceResponse } from '$lib/api/absences';
	import { ABSENCE_TYPE_LABELS } from '$lib/types/calendar';

	type Props = {
		open: boolean;
		absence: AbsenceResponse | null;
		onClose: () => void;
		onSuccess: () => void;
	};

	let { open = $bindable(), absence, onClose, onSuccess }: Props = $props();

	let submitting = $state(false);
	let error = $state<string | null>(null);

	const typeLabel = $derived(absence ? ABSENCE_TYPE_LABELS[absence.type] || absence.type : '');

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('es-ES', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	async function handleCancel() {
		if (!absence) return;

		submitting = true;
		error = null;

		try {
			await cancelAbsence(absence.id);
			onSuccess();
			handleClose();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cancelar la solicitud';
		} finally {
			submitting = false;
		}
	}

	function handleClose() {
		open = false;
		error = null;
		onClose();
	}
</script>

<AlertDialog bind:open>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>¿Cancelar solicitud de ausencia?</AlertDialogTitle>
			<AlertDialogDescription>
				{#if absence}
					Vas a cancelar tu solicitud de <strong>{typeLabel}</strong> del
					<strong>{formatDate(absence.startDate)}</strong>
					{#if absence.startDate !== absence.endDate}
						al <strong>{formatDate(absence.endDate)}</strong>
					{/if}.
					<br /><br />
					Esta acción no se puede deshacer.
				{/if}
			</AlertDialogDescription>
		</AlertDialogHeader>
		{#if error}
			<div class="text-sm text-destructive">{error}</div>
		{/if}
		<AlertDialogFooter>
			<AlertDialogCancel disabled={submitting} onclick={handleClose}>No, mantener</AlertDialogCancel
			>
			<AlertDialogAction
				onclick={handleCancel}
				disabled={submitting}
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
			>
				{#if submitting}
					<span class="material-symbols-rounded animate-spin text-lg! mr-2">progress_activity</span>
				{/if}
				Sí, cancelar solicitud
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>

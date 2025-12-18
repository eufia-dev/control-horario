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
		showUserName?: boolean;
	};

	let { open = $bindable(), absence, onClose, onSuccess, showUserName = false }: Props = $props();

	let deleting = $state(false);
	let success = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		if (!open) {
			error = null;
			success = false;
		}
	});

	const typeLabel = $derived(absence ? ABSENCE_TYPE_LABELS[absence.type] || absence.type : '');

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('es-ES', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	async function handleDelete() {
		if (!absence || deleting || success) return;

		deleting = true;
		error = null;

		try {
			await cancelAbsence(absence.id);
			deleting = false;
			success = true;
			onSuccess();
			// Small delay to show success animation before closing
			setTimeout(() => {
				open = false;
				onClose();
			}, 800);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cancelar la ausencia';
			deleting = false;
		}
	}

	function handleClose() {
		if (!deleting && !success) {
			open = false;
			onClose();
		}
	}
</script>

<AlertDialog bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>¿Cancelar ausencia?</AlertDialogTitle>
			<AlertDialogDescription>
				{#if absence}
					Estás a punto de cancelar la solicitud de ausencia
					{#if showUserName && absence.user?.name}
						de <strong>{absence.user.name}</strong>:
					{/if}
					<strong>{typeLabel}</strong> del
					<strong>{formatDate(absence.startDate)}</strong>
					{#if absence.startDate !== absence.endDate}
						al <strong>{formatDate(absence.endDate)}</strong>
					{/if}.
				{/if}
			</AlertDialogDescription>
		</AlertDialogHeader>

		{#if error}
			<div class="text-sm text-destructive">{error}</div>
		{/if}

		<AlertDialogFooter>
			<AlertDialogCancel disabled={deleting || success} onclick={handleClose}
				>Cancelar</AlertDialogCancel
			>
			<AlertDialogAction
				variant={success ? 'success' : 'destructive'}
				class="min-w-[100px] transition-all duration-300"
				disabled={deleting || success}
				onclick={handleDelete}
			>
				{#if deleting}
					<span class="material-symbols-rounded mr-2 animate-spin text-base">progress_activity</span
					>
					Cancelando...
				{:else if success}
					<span class="material-symbols-rounded mr-1 text-base animate-in zoom-in duration-200"
						>check_circle</span
					>
					Cancelado
				{:else}
					Cancelar
				{/if}
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>

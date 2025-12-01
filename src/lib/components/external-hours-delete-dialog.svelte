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
	import { deleteExternalHours, type ExternalHours } from '$lib/api/externals';

	type Props = {
		open: boolean;
		entry: ExternalHours | null;
		onClose: () => void;
		onSuccess: () => void;
	};

	let { open = $bindable(), entry, onClose, onSuccess }: Props = $props();

	let deleting = $state(false);
	let success = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		if (!open) {
			error = null;
			success = false;
		}
	});

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('es-ES', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function formatDuration(minutes: number): string {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 0) {
			return `${hours}h ${mins}m`;
		}
		return `${mins}m`;
	}

	async function handleDelete() {
		if (!entry || deleting || success) return;

		deleting = true;
		error = null;

		try {
			await deleteExternalHours(entry.externalId, entry.id);
			deleting = false;
			success = true;
			onSuccess();
			// Small delay to show success animation before closing
			setTimeout(() => {
				open = false;
				onClose();
			}, 800);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al eliminar el registro';
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
			<AlertDialogTitle>¿Eliminar horas de externo?</AlertDialogTitle>
			<AlertDialogDescription>
				Estás a punto de eliminar el registro de horas de
				<strong class="text-foreground">{entry?.external?.name ?? 'externo desconocido'}</strong>
				del <strong class="text-foreground">{entry ? formatDate(entry.date) : ''}</strong>
				({entry ? formatDuration(entry.minutes) : ''}).
				Esta acción no se puede deshacer.
			</AlertDialogDescription>
		</AlertDialogHeader>

		{#if error}
			<div class="text-sm text-destructive">{error}</div>
		{/if}

		<AlertDialogFooter>
			<AlertDialogCancel disabled={deleting || success} onclick={handleClose}>Cancelar</AlertDialogCancel>
			<AlertDialogAction
				variant={success ? 'success' : 'destructive'}
				class="min-w-[100px] transition-all duration-300"
				disabled={deleting || success}
				onclick={handleDelete}
			>
				{#if deleting}
					<span class="material-symbols-rounded mr-2 animate-spin text-base">progress_activity</span>
					Eliminando...
				{:else if success}
					<span class="material-symbols-rounded mr-1 text-base animate-in zoom-in duration-200">check_circle</span>
					Eliminado
				{:else}
					Eliminar
				{/if}
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>


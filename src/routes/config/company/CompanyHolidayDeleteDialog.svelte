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
	import { deleteCompanyHoliday, type CompanyHolidayResponse } from '$lib/api/holidays';

	type Props = {
		open: boolean;
		holiday: CompanyHolidayResponse | null;
		onClose: () => void;
		onSuccess: () => void;
	};

	let { open = $bindable(), holiday, onClose, onSuccess }: Props = $props();

	let submitting = $state(false);
	let error = $state<string | null>(null);

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('es-ES', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	async function handleDelete() {
		if (!holiday) return;

		submitting = true;
		error = null;

		try {
			await deleteCompanyHoliday(holiday.id);
			onSuccess();
			handleClose();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al eliminar el festivo';
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
			<AlertDialogTitle>¿Eliminar festivo de empresa?</AlertDialogTitle>
			<AlertDialogDescription>
				{#if holiday}
					Vas a eliminar el festivo <strong>{holiday.name}</strong> del
					<strong>{formatDate(holiday.date)}</strong>.
					<br /><br />
					Esta acción no se puede deshacer.
				{/if}
			</AlertDialogDescription>
		</AlertDialogHeader>
		{#if error}
			<div class="text-sm text-destructive">{error}</div>
		{/if}
		<AlertDialogFooter>
			<AlertDialogCancel disabled={submitting} onclick={handleClose}>Cancelar</AlertDialogCancel>
			<AlertDialogAction onclick={handleDelete} disabled={submitting} variant="destructive">
				{#if submitting}
					<span class="material-symbols-rounded animate-spin text-lg! mr-2">progress_activity</span>
				{/if}
				Eliminar festivo
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>

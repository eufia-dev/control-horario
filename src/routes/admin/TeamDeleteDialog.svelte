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
	import { deleteTeam, type Team } from '$lib/api/teams';

	type Props = {
		open: boolean;
		team: Team | null;
		onClose: () => void;
		onSuccess: () => void;
	};

	let { open = $bindable(), team = null, onClose, onSuccess }: Props = $props();

	let deleting = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		if (!open) {
			error = null;
		}
	});

	async function handleDelete() {
		if (!team || deleting) return;

		deleting = true;
		error = null;

		try {
			await deleteTeam(team.id);
			deleting = false;
			open = false;
			onSuccess();
			onClose();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al eliminar el equipo';
			deleting = false;
		}
	}

	function handleClose() {
		open = false;
		onClose();
	}
</script>

<AlertDialog bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>¿Eliminar equipo?</AlertDialogTitle>
			<AlertDialogDescription>
				{#if team}
					¿Estás seguro de que deseas eliminar el equipo <strong>{team.name}</strong>?
					<br /><br />
					<span class="text-muted-foreground">
						Esta acción desasignará a todos los miembros y proyectos de este equipo. Los usuarios y
						proyectos no serán eliminados, pero dejarán de pertenecer a este equipo.
					</span>
				{/if}
			</AlertDialogDescription>
		</AlertDialogHeader>

		{#if error}
			<div class="text-sm text-destructive py-2">{error}</div>
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
					Eliminando...
				{:else}
					Eliminar
				{/if}
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>

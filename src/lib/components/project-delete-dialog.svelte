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
	import { deleteProject, type Project } from '$lib/api/projects';

	type Props = {
		open: boolean;
		project: Project | null;
		onClose: () => void;
		onSuccess: () => void;
	};

	let { open = $bindable(), project, onClose, onSuccess }: Props = $props();

	let deleting = $state(false);
	let success = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		if (!open) {
			error = null;
			success = false;
		}
	});

	async function handleDelete() {
		if (!project || deleting || success) return;

		deleting = true;
		error = null;

		try {
			await deleteProject(project.id);
			deleting = false;
			success = true;
			onSuccess();
			// Small delay to show success animation before closing
			setTimeout(() => {
				open = false;
				onClose();
			}, 800);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al eliminar el proyecto';
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
			<AlertDialogTitle>¿Eliminar proyecto?</AlertDialogTitle>
			<AlertDialogDescription>
				Estás a punto de eliminar el proyecto
				<strong class="text-foreground">{project?.name}</strong>. Esta acción no se puede deshacer.
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
					Eliminando...
				{:else if success}
					<span class="material-symbols-rounded mr-1 text-base animate-in zoom-in duration-200"
						>check_circle</span
					>
					Eliminado
				{:else}
					Eliminar
				{/if}
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>

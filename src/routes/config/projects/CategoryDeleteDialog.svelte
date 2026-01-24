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
	import { deleteProjectCategory, type ProjectCategory } from '$lib/api/project-categories';

	type Props = {
		open: boolean;
		category: ProjectCategory | null;
		onClose: () => void;
		onSuccess: () => void;
	};

	let { open = $bindable(), category = null, onClose, onSuccess }: Props = $props();

	let deleting = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		if (!open) {
			error = null;
		}
	});

	async function handleDelete() {
		if (!category || deleting) return;

		deleting = true;
		error = null;

		try {
			await deleteProjectCategory(category.id);
			deleting = false;
			open = false;
			onSuccess();
			onClose();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al eliminar la categoría';
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
			<AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
			<AlertDialogDescription>
				{#if category}
					¿Estás seguro de que deseas eliminar la categoría <strong>{category.name}</strong>?
					<br /><br />
					<span class="text-muted-foreground">
						Esta acción no se puede deshacer. Si la categoría está asignada a proyectos, no podrá
						ser eliminada.
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

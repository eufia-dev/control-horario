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
	import { deleteProvider, type Provider } from '$lib/api/providers';

	type Props = {
		open: boolean;
		provider: Provider | null;
		onClose: () => void;
		onSuccess: () => void;
	};

	let { open = $bindable(), provider = null, onClose, onSuccess }: Props = $props();

	let deleting = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		if (!open) {
			error = null;
		}
	});

	async function handleDelete() {
		if (!provider || deleting) return;

		deleting = true;
		error = null;

		try {
			await deleteProvider(provider.id);
			deleting = false;
			open = false;
			onSuccess();
			onClose();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al eliminar el proveedor';
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
			<AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
			<AlertDialogDescription>
				{#if provider}
					¿Estás seguro de que deseas eliminar el proveedor <strong>{provider.name}</strong>?
					<br /><br />
					<span class="text-muted-foreground">
						Esta acción no se puede deshacer. Si el proveedor está asignado a registros de costes,
						no podrá ser eliminado.
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

<script lang="ts">
	import { deleteUser, type User } from '$lib/api/users';
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

	type Props = {
		open: boolean;
		user: User | null;
		onClose?: () => void;
		onSuccess?: () => void;
	};

	let { open = $bindable(), user, onClose, onSuccess }: Props = $props();

	let isDeleting = $state(false);
	let errorMessage = $state<string | null>(null);

	const handleClose = () => {
		errorMessage = null;
		onClose?.();
	};

	const handleDelete = async () => {
		if (isDeleting || !user) return;

		errorMessage = null;
		isDeleting = true;

		try {
			await deleteUser(user.id);
			open = false;
			onSuccess?.();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Error al eliminar el usuario';
		} finally {
			isDeleting = false;
		}
	};
</script>

<AlertDialog bind:open>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
			<AlertDialogDescription>
				{#if user}
					Se eliminará el usuario <strong>{user.name}</strong> ({user.email}). Esta acción no se
					puede deshacer y se eliminarán todos sus datos asociados.
				{/if}
			</AlertDialogDescription>
		</AlertDialogHeader>

		{#if errorMessage}
			<p class="text-sm text-destructive py-2">{errorMessage}</p>
		{/if}

		<AlertDialogFooter>
			<AlertDialogCancel onclick={handleClose}>Cancelar</AlertDialogCancel>
			<AlertDialogAction onclick={handleDelete} disabled={isDeleting} variant="destructive">
				{#if isDeleting}
					Eliminando...
				{:else}
					Eliminar
				{/if}
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>

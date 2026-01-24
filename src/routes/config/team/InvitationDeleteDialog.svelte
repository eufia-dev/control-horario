<script lang="ts">
	import { deleteInvitation, type Invitation } from '$lib/api/invitations';
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
		invitation: Invitation | null;
		onClose?: () => void;
		onSuccess?: () => void;
	};

	let { open = $bindable(), invitation, onClose, onSuccess }: Props = $props();

	let isDeleting = $state(false);
	let errorMessage = $state<string | null>(null);

	const handleClose = () => {
		errorMessage = null;
		onClose?.();
	};

	const handleDelete = async () => {
		if (isDeleting || !invitation) return;

		errorMessage = null;
		isDeleting = true;

		try {
			await deleteInvitation(invitation.id);
			open = false;
			onSuccess?.();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Error al eliminar la invitación';
		} finally {
			isDeleting = false;
		}
	};
</script>

<AlertDialog bind:open>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>¿Eliminar invitación?</AlertDialogTitle>
			<AlertDialogDescription>
				{#if invitation}
					Se eliminará la invitación enviada a <strong>{invitation.email}</strong>. Esta acción no
					se puede deshacer.
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

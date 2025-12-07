<script lang="ts">
	import { deleteInvitation, type Invitation } from '$lib/api/invitations';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';

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

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>¿Eliminar invitación?</AlertDialog.Title>
			<AlertDialog.Description>
				{#if invitation}
					Se eliminará la invitación enviada a <strong>{invitation.email}</strong>. Esta acción no
					se puede deshacer.
				{/if}
			</AlertDialog.Description>
		</AlertDialog.Header>

		{#if errorMessage}
			<p class="text-sm text-destructive py-2">{errorMessage}</p>
		{/if}

		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={handleClose}>Cancelar</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={handleDelete}
				disabled={isDeleting}
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
			>
				{#if isDeleting}
					Eliminando...
				{:else}
					Eliminar
				{/if}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<script lang="ts">
	import { removeMyTeamMember } from '$lib/api/teams';
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

	type TeamMember = {
		id: string;
		name: string;
		email: string;
	};

	type Props = {
		open: boolean;
		member: TeamMember | null;
		teamName: string;
		onClose?: () => void;
		onSuccess?: () => void;
	};

	let { open = $bindable(), member, teamName, onClose, onSuccess }: Props = $props();

	let isRemoving = $state(false);
	let errorMessage = $state<string | null>(null);

	const handleClose = () => {
		errorMessage = null;
		onClose?.();
	};

	const handleRemove = async () => {
		if (isRemoving || !member) return;

		errorMessage = null;
		isRemoving = true;

		try {
			await removeMyTeamMember(member.id);
			open = false;
			onSuccess?.();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Error al eliminar el miembro';
		} finally {
			isRemoving = false;
		}
	};
</script>

<AlertDialog bind:open>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>¿Eliminar miembro del equipo?</AlertDialogTitle>
			<AlertDialogDescription>
				{#if member}
					Se eliminará a <strong>{member.name}</strong> ({member.email}) del equipo <strong
						>{teamName}</strong
					>. El usuario seguirá existiendo pero quedará sin equipo asignado.
				{/if}
			</AlertDialogDescription>
		</AlertDialogHeader>

		{#if errorMessage}
			<p class="text-sm text-destructive py-2">{errorMessage}</p>
		{/if}

		<AlertDialogFooter>
			<AlertDialogCancel onclick={handleClose}>Cancelar</AlertDialogCancel>
			<AlertDialogAction onclick={handleRemove} disabled={isRemoving} variant="destructive">
				{#if isRemoving}
					Eliminando...
				{:else}
					Eliminar del equipo
				{/if}
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>

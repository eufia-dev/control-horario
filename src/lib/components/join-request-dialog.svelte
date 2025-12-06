<script lang="ts">
	import { approveJoinRequest, rejectJoinRequest, type AdminJoinRequest } from '$lib/api/invitations';
	import type { UserRole } from '$lib/stores/auth';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Field, FieldLabel, FieldDescription } from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';

	type Props = {
		open: boolean;
		request: AdminJoinRequest | null;
		action: 'approve' | 'reject';
		onClose?: () => void;
		onSuccess?: () => void;
	};

	let { open = $bindable(), request, action, onClose, onSuccess }: Props = $props();

	let role = $state<UserRole>('WORKER');
	let reason = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	const roleOptions: { value: UserRole; label: string }[] = [
		{ value: 'WORKER', label: 'Trabajador' },
		{ value: 'ADMIN', label: 'Administrador' },
		{ value: 'AUDITOR', label: 'Auditor' }
	];

	const resetForm = () => {
		role = 'WORKER';
		reason = '';
		errorMessage = null;
	};

	const handleClose = () => {
		resetForm();
		onClose?.();
	};

	const handleSubmit = async () => {
		if (isSubmitting || !request) return;

		errorMessage = null;
		isSubmitting = true;

		try {
			if (action === 'approve') {
				await approveJoinRequest(request.id, { role });
			} else {
				await rejectJoinRequest(request.id, { reason: reason.trim() || undefined });
			}

			resetForm();
			open = false;
			onSuccess?.();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Error al procesar la solicitud';
		} finally {
			isSubmitting = false;
		}
	};

	// Reset form when modal opens
	$effect(() => {
		if (open) {
			resetForm();
		}
	});

	const isApprove = $derived(action === 'approve');
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title class="flex items-center gap-2">
				{#if isApprove}
					<span class="material-symbols-rounded text-success">check_circle</span>
					Aprobar solicitud
				{:else}
					<span class="material-symbols-rounded text-destructive">cancel</span>
					Rechazar solicitud
				{/if}
			</AlertDialog.Title>
			<AlertDialog.Description>
				{#if request}
					{#if isApprove}
						¿Aprobar la solicitud de <strong>{request.name}</strong> ({request.email}) para unirse a la empresa?
					{:else}
						¿Rechazar la solicitud de <strong>{request.name}</strong> ({request.email})?
					{/if}
				{/if}
			</AlertDialog.Description>
		</AlertDialog.Header>

		<div class="py-4 space-y-4">
			{#if isApprove}
				<Field>
					<FieldLabel>
						<Label for="approve-role">Rol asignado</Label>
					</FieldLabel>
					<Select.Root type="single" bind:value={role}>
						<Select.Trigger id="approve-role" class="w-full">
							{roleOptions.find((r) => r.value === role)?.label ?? 'Seleccionar rol'}
						</Select.Trigger>
						<Select.Content>
							{#each roleOptions as option (option.value)}
								<Select.Item value={option.value}>{option.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<FieldDescription class="text-xs text-muted-foreground">
						El rol que tendrá el usuario en la empresa
					</FieldDescription>
				</Field>
			{:else}
				<Field>
					<FieldLabel>
						<Label for="reject-reason">Motivo (opcional)</Label>
					</FieldLabel>
					<Textarea
						id="reject-reason"
						placeholder="Explica el motivo del rechazo..."
						bind:value={reason}
						rows={3}
					/>
				</Field>
			{/if}

			{#if errorMessage}
				<p class="text-sm text-destructive">{errorMessage}</p>
			{/if}
		</div>

		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={handleClose}>Cancelar</AlertDialog.Cancel>
			<Button
				onclick={handleSubmit}
				disabled={isSubmitting}
				variant={isApprove ? 'default' : 'destructive'}
			>
				{#if isSubmitting}
					Procesando...
				{:else if isApprove}
					Aprobar
				{:else}
					Rechazar
				{/if}
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>


<script lang="ts">
	import {
		approveJoinRequest,
		rejectJoinRequest,
		fetchJoinRequestOptions,
		type AdminJoinRequest,
		type JoinRequestOptions,
		type RelationType
	} from '$lib/api/invitations';
	import type { UserRole } from '$lib/stores/auth';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Field, FieldLabel } from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Skeleton } from '$lib/components/ui/skeleton';

	type Props = {
		open: boolean;
		request: AdminJoinRequest | null;
		action: 'approve' | 'reject';
		onClose?: () => void;
		onSuccess?: () => void;
	};

	let { open = $bindable(), request, action, onClose, onSuccess }: Props = $props();

	let role = $state<UserRole>('WORKER');
	let relationType = $state<RelationType>('EMPLOYEE');
	let reason = $state('');
	let isSubmitting = $state(false);
	let isLoadingOptions = $state(false);
	let errorMessage = $state<string | null>(null);
	let options = $state<JoinRequestOptions | null>(null);

	const resetForm = () => {
		role = 'WORKER';
		relationType = 'EMPLOYEE';
		reason = '';
		errorMessage = null;
	};

	const loadOptions = async () => {
		if (options) return;
		isLoadingOptions = true;
		try {
			options = await fetchJoinRequestOptions();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Error al cargar opciones';
		} finally {
			isLoadingOptions = false;
		}
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
				await approveJoinRequest(request.id, { role, relationType });
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

	$effect(() => {
		if (open && action === 'approve') {
			resetForm();
			loadOptions();
		} else if (open) {
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
						¿Aprobar la solicitud de <strong>{request.name}</strong> ({request.email}) para unirse a
						la empresa?
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
					{#if isLoadingOptions}
						<Skeleton class="h-10 w-full" />
					{:else}
						<Select.Root type="single" bind:value={role}>
							<Select.Trigger id="approve-role" class="w-full">
								{options?.roles.find((r) => r.value === role)?.name ?? 'Seleccionar rol'}
							</Select.Trigger>
							<Select.Content>
								{#each options?.roles ?? [] as option (option.value)}
									<Select.Item value={option.value}>{option.name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					{/if}
				</Field>

				<Field>
					<FieldLabel>
						<Label for="approve-relation-type">Tipo de relación</Label>
					</FieldLabel>
					{#if isLoadingOptions}
						<Skeleton class="h-10 w-full" />
					{:else}
						<Select.Root type="single" bind:value={relationType}>
							<Select.Trigger id="approve-relation-type" class="w-full">
								{options?.relationTypes.find((r) => r.value === relationType)?.name ??
									'Seleccionar tipo'}
							</Select.Trigger>
							<Select.Content>
								{#each options?.relationTypes ?? [] as option (option.value)}
									<Select.Item value={option.value}>{option.name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					{/if}
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
				disabled={isSubmitting || (isApprove && isLoadingOptions)}
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

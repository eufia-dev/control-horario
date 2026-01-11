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
	import { Label } from '$lib/components/ui/label';
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
	let relation = $state<RelationType>('EMPLOYEE');
	let reason = $state('');
	let isSubmitting = $state(false);
	let success = $state(false);
	let isLoadingOptions = $state(false);
	let errorMessage = $state<string | null>(null);
	let options = $state<JoinRequestOptions | null>(null);

	const isAuditor = $derived(role === 'AUDITOR');
	const isWorker = $derived(role === 'WORKER');
	const isTeamLeader = $derived(role === 'TEAM_LEADER');

	const resetForm = () => {
		role = 'WORKER';
		relation = 'EMPLOYEE';
		reason = '';
		errorMessage = null;
		success = false;
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
		if (isSubmitting || success || !request) return;

		errorMessage = null;
		isSubmitting = true;

		try {
			if (action === 'approve') {
				await approveJoinRequest(request.id, { role, relation });
			} else {
				await rejectJoinRequest(request.id, { reason: reason.trim() || undefined });
			}

			isSubmitting = false;
			success = true;
			onSuccess?.();
			// Small delay to show success animation before closing
			setTimeout(() => {
				open = false;
				resetForm();
				onClose?.();
			}, 800);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Error al procesar la solicitud';
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

	$effect(() => {
		if (role === 'AUDITOR') {
			relation = 'GUEST';
		} else if (role === 'WORKER') {
			relation = 'EMPLOYEE';
		}
	});

	const isApprove = $derived(action === 'approve');

	const availableRelationTypes = $derived(
		isWorker
			? (options?.relationTypes.filter((r) => r.value !== 'GUEST') ?? [])
			: (options?.relationTypes ?? [])
	);
</script>

<AlertDialog bind:open>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle class="flex items-center gap-2">
				{#if isApprove}
					<span class="material-symbols-rounded text-success">check_circle</span>
					Aprobar solicitud
				{:else}
					<span class="material-symbols-rounded text-destructive">cancel</span>
					Rechazar solicitud
				{/if}
			</AlertDialogTitle>
			<AlertDialogDescription>
				{#if request}
					{#if isApprove}
						¿Aprobar la solicitud de <strong>{request.name}</strong> ({request.email}) para unirse a
						la empresa?
					{:else}
						¿Rechazar la solicitud de <strong>{request.name}</strong> ({request.email})?
					{/if}
				{/if}
			</AlertDialogDescription>
		</AlertDialogHeader>

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
						<Label for="approve-relation-type">Relación</Label>
					</FieldLabel>
					{#if isLoadingOptions}
						<Skeleton class="h-10 w-full" />
					{:else}
						<Select.Root type="single" bind:value={relation} disabled={isAuditor}>
							<Select.Trigger id="approve-relation-type" class="w-full" disabled={isAuditor}>
								{options?.relationTypes.find((r) => r.value === relation)?.name ??
									'Seleccionar tipo'}
							</Select.Trigger>
							<Select.Content>
								{#each availableRelationTypes as option (option.value)}
									<Select.Item value={option.value}>{option.name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					{/if}
				</Field>

				{#if isTeamLeader}
					<div
						class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2"
					>
						<span class="material-symbols-rounded text-amber-600 text-lg! shrink-0">warning</span>
						<p class="text-xs text-amber-700 dark:text-amber-300">
							Recuerda asignar al usuario a un equipo después de aprobar. Un jefe de equipo sin
							equipo asignado tendrá funcionalidad limitada.
						</p>
					</div>
				{/if}
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

		<AlertDialogFooter>
			<AlertDialogCancel onclick={handleClose} disabled={isSubmitting || success}
				>Cancelar</AlertDialogCancel
			>
			<AlertDialogAction
				onclick={handleSubmit}
				disabled={isSubmitting || success || (isApprove && isLoadingOptions)}
				variant={success ? 'success' : isApprove ? 'default' : 'destructive'}
				class="min-w-[100px] transition-all duration-300"
			>
				{#if isSubmitting}
					<span class="material-symbols-rounded animate-spin text-base">progress_activity</span>
					Procesando...
				{:else if success}
					<span class="material-symbols-rounded text-base animate-in zoom-in duration-200"
						>check_circle</span
					>
					{isApprove ? 'Aprobado' : 'Rechazado'}
				{:else if isApprove}
					Aprobar
				{:else}
					Rechazar
				{/if}
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>

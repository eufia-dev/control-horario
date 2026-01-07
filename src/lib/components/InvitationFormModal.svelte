<script lang="ts">
	import {
		createInvitation,
		fetchInvitationOptions,
		type RelationType,
		type InvitationOptions
	} from '$lib/api/invitations';
	import type { UserRole } from '$lib/stores/auth';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Field, FieldLabel, FieldError } from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';
	import { Skeleton } from '$lib/components/ui/skeleton';

	type Props = {
		open: boolean;
		onClose?: () => void;
		onSuccess?: () => void;
	};

	let { open = $bindable(), onClose, onSuccess }: Props = $props();

	let email = $state('');
	let role = $state<UserRole>('WORKER');
	let relation = $state<RelationType>('EMPLOYEE');
	let isSubmitting = $state(false);
	let success = $state(false);
	let isLoadingOptions = $state(false);
	let errorMessage = $state<string | null>(null);
	let options = $state<InvitationOptions | null>(null);

	const isAuditor = $derived(role === 'AUDITOR');
	const isWorker = $derived(role === 'WORKER');

	const resetForm = () => {
		email = '';
		role = 'WORKER';
		relation = 'EMPLOYEE';
		errorMessage = null;
		success = false;
	};

	const loadOptions = async () => {
		if (options) return;
		isLoadingOptions = true;
		try {
			options = await fetchInvitationOptions();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Error al cargar opciones';
		} finally {
			isLoadingOptions = false;
		}
	};

	const handleClose = () => {
		if (!open) return;
		open = false;
	};

	const handleSubmit = async () => {
		if (isSubmitting || success) return;

		errorMessage = null;

		if (!email.trim()) {
			errorMessage = 'El correo electrónico es obligatorio';
			return;
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email.trim())) {
			errorMessage = 'Introduce un correo electrónico válido';
			return;
		}

		isSubmitting = true;

		try {
			await createInvitation({
				email: email.trim(),
				role,
				relation
			});

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
			errorMessage = error instanceof Error ? error.message : 'Error al crear la invitación';
			isSubmitting = false;
		}
	};

	$effect(() => {
		if (open) {
			resetForm();
			loadOptions();
		}
	});

	$effect(() => {
		if (role === 'AUDITOR') {
			relation = 'GUEST';
		} else if (role === 'WORKER') {
			relation = 'EMPLOYEE';
		}
	});

	const availableRelationTypes = $derived(
		isWorker
			? (options?.relationTypes.filter((r) => r.value !== 'GUEST') ?? [])
			: (options?.relationTypes ?? [])
	);
</script>

<Dialog
	bind:open
	onOpenChange={(isOpen) => {
		if (!isOpen) {
			resetForm();
			onClose?.();
		}
	}}
>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2">
				<span class="material-symbols-rounded text-primary">person_add</span>
				Nueva invitación
			</DialogTitle>
			<DialogDescription>
				Envía una invitación por correo electrónico para que un nuevo usuario se una a tu empresa
			</DialogDescription>
		</DialogHeader>

		<form
			class="space-y-6 py-4"
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
		>
			<Field>
				<FieldLabel>
					<Label for="invitation-email">Correo electrónico *</Label>
				</FieldLabel>
				<Input
					id="invitation-email"
					type="email"
					placeholder="usuario@ejemplo.com"
					bind:value={email}
					required
					disabled={isLoadingOptions}
				/>
			</Field>

			<Field>
				<FieldLabel>
					<Label for="invitation-role">Rol</Label>
				</FieldLabel>
				{#if isLoadingOptions}
					<Skeleton class="h-10 w-full" />
				{:else}
					<Select.Root type="single" bind:value={role}>
						<Select.Trigger id="invitation-role" class="w-full">
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
					<Label for="invitation-relation-type">Relación</Label>
				</FieldLabel>
				{#if isLoadingOptions}
					<Skeleton class="h-10 w-full" />
				{:else}
					<Select.Root type="single" bind:value={relation} disabled={isAuditor}>
						<Select.Trigger id="invitation-relation-type" class="w-full" disabled={isAuditor}>
							{options?.relationTypes.find((r) => r.value === relation)?.name ?? 'Seleccionar tipo'}
						</Select.Trigger>
						<Select.Content>
							{#each availableRelationTypes as option (option.value)}
								<Select.Item value={option.value}>{option.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				{/if}
			</Field>

			{#if errorMessage}
				<FieldError class="text-sm text-destructive">{errorMessage}</FieldError>
			{/if}

			<DialogFooter>
				<Button
					variant="outline"
					type="button"
					onclick={handleClose}
					disabled={isSubmitting || success}
				>
					Cancelar
				</Button>
				<Button
					type="submit"
					variant={success ? 'success' : 'default'}
					disabled={isSubmitting || success || isLoadingOptions}
					class="min-w-34"
				>
					{#if isSubmitting}
						<span class="material-symbols-rounded animate-spin text-base">progress_activity</span>
					{:else if success}
						<span class="material-symbols-rounded text-base animate-in zoom-in duration-200"
							>check_circle</span
						>
					{:else}
						Crear invitación
					{/if}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

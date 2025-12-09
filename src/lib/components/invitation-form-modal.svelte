<script lang="ts">
	import {
		createInvitation,
		fetchInvitationOptions,
		type RelationType,
		type InvitationOptions
	} from '$lib/api/invitations';
	import type { UserRole } from '$lib/stores/auth';
	import * as Dialog from '$lib/components/ui/dialog';
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
	let relationType = $state<RelationType>('EMPLOYEE');
	let isSubmitting = $state(false);
	let isLoadingOptions = $state(false);
	let errorMessage = $state<string | null>(null);
	let options = $state<InvitationOptions | null>(null);

	const resetForm = () => {
		email = '';
		role = 'WORKER';
		relationType = 'EMPLOYEE';
		errorMessage = null;
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
		if (isSubmitting) return;

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
				relationType
			});

			resetForm();
			open = false;
			onSuccess?.();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Error al crear la invitación';
		} finally {
			isSubmitting = false;
		}
	};

	$effect(() => {
		if (open) {
			resetForm();
			loadOptions();
		}
	});
</script>

<Dialog.Root
	bind:open
	onOpenChange={(isOpen) => {
		if (!isOpen) {
			resetForm();
			onClose?.();
		}
	}}
>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<span class="material-symbols-rounded text-primary">person_add</span>
				Nueva invitación
			</Dialog.Title>
			<Dialog.Description>
				Envía una invitación por correo electrónico para que un nuevo usuario se una a tu empresa
			</Dialog.Description>
		</Dialog.Header>

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
					<Label for="invitation-relation-type">Tipo de relación</Label>
				</FieldLabel>
				{#if isLoadingOptions}
					<Skeleton class="h-10 w-full" />
				{:else}
					<Select.Root type="single" bind:value={relationType}>
						<Select.Trigger id="invitation-relation-type" class="w-full">
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

			{#if errorMessage}
				<FieldError class="text-sm text-destructive">{errorMessage}</FieldError>
			{/if}

			<Dialog.Footer>
				<Button variant="outline" type="button" onclick={handleClose}>Cancelar</Button>
				<Button type="submit" disabled={isSubmitting || isLoadingOptions}>
					{#if isSubmitting}
						Enviando...
					{:else}
						Crear invitación
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

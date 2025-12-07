<script lang="ts">
	import { createInvitation } from '$lib/api/invitations';
	import type { UserRole } from '$lib/stores/auth';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Field, FieldLabel, FieldError, FieldDescription } from '$lib/components/ui/field';
	import * as Select from '$lib/components/ui/select';

	type Props = {
		open: boolean;
		onClose?: () => void;
		onSuccess?: () => void;
	};

	let { open = $bindable(), onClose, onSuccess }: Props = $props();

	let email = $state('');
	let role = $state<UserRole>('WORKER');
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	const roleOptions: { value: UserRole; label: string }[] = [
		{ value: 'WORKER', label: 'Trabajador' },
		{ value: 'ADMIN', label: 'Administrador' },
		{ value: 'AUDITOR', label: 'Auditor' }
	];

	const resetForm = () => {
		email = '';
		role = 'WORKER';
		errorMessage = null;
	};

	const handleClose = () => {
		resetForm();
		onClose?.();
	};

	const handleSubmit = async () => {
		if (isSubmitting) return;

		errorMessage = null;

		if (!email.trim()) {
			errorMessage = 'El correo electrónico es obligatorio';
			return;
		}

		// Basic email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email.trim())) {
			errorMessage = 'Introduce un correo electrónico válido';
			return;
		}

		isSubmitting = true;

		try {
			await createInvitation({
				email: email.trim(),
				role
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

	// Reset form when modal opens
	$effect(() => {
		if (open) {
			resetForm();
		}
	});
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
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
				/>
			</Field>

			<Field>
				<FieldLabel>
					<Label for="invitation-role">Rol</Label>
				</FieldLabel>
				<Select.Root type="single" bind:value={role}>
					<Select.Trigger id="invitation-role" class="w-full">
						{roleOptions.find((r) => r.value === role)?.label ?? 'Seleccionar rol'}
					</Select.Trigger>
					<Select.Content>
						{#each roleOptions as option (option.value)}
							<Select.Item value={option.value}>{option.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				<FieldDescription class="text-xs text-muted-foreground">
					El rol que tendrá el usuario cuando acepte la invitación
				</FieldDescription>
			</Field>

			{#if errorMessage}
				<FieldError class="text-sm text-destructive">{errorMessage}</FieldError>
			{/if}

			<Dialog.Footer>
				<Button variant="outline" type="button" onclick={handleClose}>Cancelar</Button>
				<Button type="submit" disabled={isSubmitting}>
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

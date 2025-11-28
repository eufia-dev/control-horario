<script lang="ts">
	import { goto } from '$app/navigation';
	import { resetPassword } from '$lib/auth';
	import { mustChangePassword } from '$lib/stores/auth';
	import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Field, FieldLabel, FieldError } from '$lib/components/ui/field';
	import { InputGroup, InputGroupInput, InputGroupButton } from '$lib/components/ui/input-group';

	let mustChange = $state(false);

	$effect(() => {
		const unsubscribe = mustChangePassword.subscribe((value) => {
			mustChange = value;
		});
		return unsubscribe;
	});

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmNewPassword = $state('');
	let showCurrentPassword = $state(false);
	let showNewPassword = $state(false);
	let showConfirmPassword = $state(false);

	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);
	let newPasswordError = $state<string | null>(null);

	const handleSubmit = async () => {
		if (isSubmitting) return;

		errorMessage = null;
		newPasswordError = null;

		if (!currentPassword || !newPassword) {
			errorMessage = 'Por favor, rellena todos los campos.';
			return;
		}

		if (newPassword.length < 6) {
			newPasswordError = 'La contraseña debe tener al menos 6 caracteres.';
			return;
		}

		if (newPassword !== confirmNewPassword) {
			errorMessage = 'Las nuevas contraseñas no coinciden.';
			return;
		}

		isSubmitting = true;

		try {
			await resetPassword(currentPassword, newPassword);
			await goto('/');
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se ha podido restablecer la contraseña';
		} finally {
			isSubmitting = false;
		}
	};
</script>

<div class="grow flex items-center justify-center bg-background px-4">
	<div class="flex flex-col w-full max-w-md items-start gap-2 -mt-16">
		{#if !mustChange}
			<Button
				variant="ghost"
				size="sm"
				aria-label="Volver al perfil"
				onclick={() => goto('/profile')}
				class="text-muted-foreground"
			>
				<span class="material-symbols-rounded text-xl!">arrow_back</span>
				Volver al perfil
			</Button>
		{/if}
		<Card class="w-full">
			<CardHeader class="space-y-1">
				<CardTitle class="text-2xl font-semibold tracking-tight">Cambiar contraseña</CardTitle>
				<CardDescription>
					Introduce tu contraseña actual y elige una nueva contraseña para tu cuenta.
				</CardDescription>
				<p class="text-sm text-muted-foreground pt-2">
					Si has olvidado tu contraseña, contacta con soporte en <a href="mailto:support@eufia.eu" class="text-primary underline underline-offset-4 hover:text-primary/80">support@eufia.eu</a>
				</p>
			</CardHeader>
			<CardContent>
				<form class="space-y-6" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
					<Field>
						<FieldLabel>
							<Label for="currentPassword">Contraseña actual</Label>
						</FieldLabel>
						<InputGroup>
							<InputGroupInput
								id="currentPassword"
								type={showCurrentPassword ? 'text' : 'password'}
								bind:value={currentPassword}
								required
								autocomplete="current-password"
							/>
							<InputGroupButton
								type="button"
								onclick={() => (showCurrentPassword = !showCurrentPassword)}
								aria-label={showCurrentPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
							>
								<span class="material-symbols-rounded">
									{showCurrentPassword ? 'visibility_off' : 'visibility'}
								</span>
							</InputGroupButton>
						</InputGroup>
					</Field>

					<Field>
						<FieldLabel>
							<Label for="newPassword">Nueva contraseña</Label>
						</FieldLabel>
						<InputGroup>
							<InputGroupInput
								id="newPassword"
								type={showNewPassword ? 'text' : 'password'}
								bind:value={newPassword}
								required
								minlength={6}
								autocomplete="new-password"
								oninput={() => {
									if (newPasswordError) newPasswordError = null;
								}}
							/>
							<InputGroupButton
								type="button"
								onclick={() => (showNewPassword = !showNewPassword)}
								aria-label={showNewPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
							>
								<span class="material-symbols-rounded">
									{showNewPassword ? 'visibility_off' : 'visibility'}
								</span>
							</InputGroupButton>
						</InputGroup>
						{#if newPasswordError}
							<FieldError class="text-sm text-destructive">{newPasswordError}</FieldError>
						{/if}
					</Field>

					<Field>
						<FieldLabel>
							<Label for="confirmNewPassword">Confirmar nueva contraseña</Label>
						</FieldLabel>
						<InputGroup>
							<InputGroupInput
								id="confirmNewPassword"
								type={showConfirmPassword ? 'text' : 'password'}
								bind:value={confirmNewPassword}
								required
								autocomplete="new-password"
							/>
							<InputGroupButton
								type="button"
								onclick={() => (showConfirmPassword = !showConfirmPassword)}
								aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
							>
								<span class="material-symbols-rounded">
									{showConfirmPassword ? 'visibility_off' : 'visibility'}
								</span>
							</InputGroupButton>
						</InputGroup>
					</Field>

					{#if errorMessage}
						<FieldError class="text-sm text-destructive">{errorMessage}</FieldError>
					{/if}

					<CardFooter class="px-0">
						<Button type="submit" class="w-full" disabled={isSubmitting}>
							{#if isSubmitting}
								Actualizando contraseña...
							{:else}
								Actualizar contraseña
							{/if}
						</Button>
					</CardFooter>
				</form>
			</CardContent>
		</Card>
	</div>
</div>



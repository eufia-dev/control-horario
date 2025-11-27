<script lang="ts">
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import { resetPassword } from '$lib/auth';
	import { auth } from '$lib/stores/auth';
	import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Field, FieldLabel, FieldDescription, FieldError } from '$lib/components/ui/field';
	import { InputGroup, InputGroupInput, InputGroupButton } from '$lib/components/ui/input-group';

	let currentPassword = '';
	let newPassword = '';
	let confirmNewPassword = '';
	let showCurrentPassword = false;
	let showNewPassword = false;
	let showConfirmPassword = false;

	let isSubmitting = false;
	let errorMessage: string | null = null;
	let newPasswordError: string | null = null;

	// Track if we've seen initialization happen (to avoid acting on initial store state)
	let hasSeenInitializing = false;
	let authInitialized = false;

	const unsubAuth = auth.subscribe((authState) => {
		// Track when we see isInitializing: true (refresh in progress)
		if (authState.isInitializing) {
			hasSeenInitializing = true;
			return;
		}
		
		// Only consider auth initialized after we've seen isInitializing cycle
		// or if there's already a user (meaning auth was restored from a previous session)
		if (hasSeenInitializing || authState.user) {
			authInitialized = true;
		}
		
		// Skip guard during submission or if auth hasn't properly initialized yet
		if (isSubmitting || !authInitialized) return;
		
		// Redirect to login if not authenticated (user must be logged in to change password)
		if (!authState.user) {
			goto('/login');
		}
	});

	onDestroy(() => {
		unsubAuth();
	});

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

<div class="min-h-screen flex items-center justify-center bg-background px-4">
	<Card class="w-full max-w-md">
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
			<form class="space-y-6" on:submit|preventDefault={handleSubmit}>
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

				<CardFooter class="flex flex-col gap-2 px-0">
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



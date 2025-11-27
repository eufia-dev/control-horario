<script lang="ts">
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import { resetPassword } from '$lib/auth';
	import { isAuthenticated, mustChangePassword } from '$lib/stores/auth';
	import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Field, FieldLabel, FieldDescription, FieldError } from '$lib/components/ui/field';
	import { InputGroup, InputGroupInput, InputGroupButton } from '$lib/components/ui/input-group';

	let oldPassword = '';
	let newPassword = '';
	let confirmNewPassword = '';
	let showOldPassword = false;
	let showNewPassword = false;
	let showConfirmPassword = false;

	let isSubmitting = false;
	let errorMessage: string | null = null;
	let newPasswordError: string | null = null;

	let isAuthenticatedValue = false;
	let mustChangePasswordValue = false;

	const unsubAuth = isAuthenticated.subscribe((value) => {
		isAuthenticatedValue = value;
		runGuard();
	});

	const unsubMustChange = mustChangePassword.subscribe((value) => {
		mustChangePasswordValue = value;
		runGuard();
	});

	function runGuard() {
		if (typeof window === 'undefined') return;
		if (isSubmitting) return;

		// If not authenticated, go back to login; if authenticated but no need to change password, go home.
		if (!isAuthenticatedValue) {
			goto('/login');
		} else if (!mustChangePasswordValue) {
			goto('/');
		}
	}

	onDestroy(() => {
		unsubAuth();
		unsubMustChange();
	});

	const handleSubmit = async () => {
		if (isSubmitting) return;

		errorMessage = null;
		newPasswordError = null;

		if (!oldPassword || !newPassword) {
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
			await resetPassword(oldPassword, newPassword);
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
			<CardTitle class="text-2xl font-semibold tracking-tight">Restablecer contraseña</CardTitle>
			<CardDescription>
				Para continuar, debes establecer una nueva contraseña para tu cuenta.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<form class="space-y-6" on:submit|preventDefault={handleSubmit}>
				<Field>
					<FieldLabel>
						<Label for="oldPassword">Contraseña actual</Label>
					</FieldLabel>
					<InputGroup>
						<InputGroupInput
							id="oldPassword"
							type={showOldPassword ? 'text' : 'password'}
							bind:value={oldPassword}
							required
							autocomplete="current-password"
						/>
						<InputGroupButton
							type="button"
							onclick={() => (showOldPassword = !showOldPassword)}
							aria-label={showOldPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
						>
							<span class="material-symbols-rounded">
								{showOldPassword ? 'visibility_off' : 'visibility'}
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
					<FieldDescription>Elige una contraseña segura que no uses en otros sitios.</FieldDescription>
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



<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { updatePassword, processAuthCallback, cleanupAuthUrl, resendConfirmationEmail } from '$lib/auth';
	import { auth } from '$lib/stores/auth';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent,
		CardFooter
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Field, FieldLabel, FieldError } from '$lib/components/ui/field';
	import { InputGroup, InputGroupInput, InputGroupButton } from '$lib/components/ui/input-group';

	let isLoading = $state(true);
	let isPasswordReset = $state(false);
	let errorMessage = $state<string | null>(null);

	let newPassword = $state('');
	let confirmPassword = $state('');
	let showNewPassword = $state(false);
	let showConfirmPassword = $state(false);
	let isSubmitting = $state(false);
	let passwordError = $state<string | null>(null);
	let passwordUpdated = $state(false);

	let resendEmail = $state('');
	let isResending = $state(false);
	let resendSuccess = $state(false);
	let resendError = $state<string | null>(null);

	onMount(async () => {
		const result = await processAuthCallback();
		cleanupAuthUrl();

		if (result.mode === 'passwordReset') {
			isPasswordReset = true;
			isLoading = false;
			auth.setInitializing(false);
			return;
		}

		if (result.mode === 'signin' && result.nextRoute) {
			auth.setInitializing(false);
			isLoading = false;
			await goto(result.nextRoute, { replaceState: true });
			return;
		}

		errorMessage = result.error ?? 'No se pudo procesar el enlace.';
		auth.setInitializing(false);
		isLoading = false;
	});

	const handlePasswordUpdate = async () => {
		if (isSubmitting) return;

		errorMessage = null;
		passwordError = null;

		if (newPassword.length < 6) {
			passwordError = 'La contraseña debe tener al menos 6 caracteres.';
			return;
		}

		if (newPassword !== confirmPassword) {
			errorMessage = 'Las contraseñas no coinciden.';
			return;
		}

		isSubmitting = true;

		try {
			await updatePassword(newPassword);
			passwordUpdated = true;
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'No se ha podido actualizar la contraseña';
		} finally {
			isSubmitting = false;
		}
	};

	const handleResendConfirmation = async () => {
		if (isResending || !resendEmail) return;

		resendError = null;
		resendSuccess = false;
		isResending = true;

		try {
			await resendConfirmationEmail(resendEmail);
			resendSuccess = true;
		} catch (error) {
			resendError =
				error instanceof Error ? error.message : 'No se ha podido reenviar el correo de confirmación';
		} finally {
			isResending = false;
		}
	};
</script>

<div class="grow flex items-center justify-center bg-background px-4">
	{#if isLoading}
		<div class="flex items-center gap-3 text-muted-foreground">
			<span class="material-symbols-rounded animate-spin text-2xl!">progress_activity</span>
			<span>Procesando...</span>
		</div>
	{:else if errorMessage && !isPasswordReset}
		<Card class="w-full max-w-md -mt-10">
			<CardHeader class="space-y-1">
				<CardTitle class="text-2xl font-semibold tracking-tight text-destructive">Error</CardTitle>
				<CardDescription>{errorMessage}</CardDescription>
			</CardHeader>
			<CardContent class="space-y-6">
				{#if resendSuccess}
					<div
						class="flex items-center gap-3 p-4 bg-success/10 text-success rounded-lg border border-success/20"
					>
						<span class="material-symbols-rounded text-2xl!">mark_email_read</span>
						<p class="text-sm">
							Te hemos enviado un nuevo correo de confirmación. Revisa tu bandeja de entrada.
						</p>
					</div>
				{:else}
					<div class="space-y-4">
						<p class="text-sm text-muted-foreground">
							Si tu enlace de confirmación ha expirado, puedes solicitar uno nuevo introduciendo tu correo electrónico:
						</p>
						<form
							class="space-y-4"
							onsubmit={(e) => {
								e.preventDefault();
								handleResendConfirmation();
							}}
						>
							<Field>
								<FieldLabel>
									<Label for="resendEmail">Correo electrónico</Label>
								</FieldLabel>
								<Input
									id="resendEmail"
									type="email"
									placeholder="tu@ejemplo.com"
									bind:value={resendEmail}
									required
									autocomplete="email"
								/>
							</Field>
							{#if resendError}
								<FieldError class="text-sm text-destructive">{resendError}</FieldError>
							{/if}
							<Button type="submit" class="w-full" disabled={isResending || !resendEmail}>
								{#if isResending}
									<span class="material-symbols-rounded animate-spin text-lg! mr-2">progress_activity</span>
									Enviando...
								{:else}
									<span class="material-symbols-rounded text-lg! mr-2">send</span>
									Reenviar correo de confirmación
								{/if}
							</Button>
						</form>
					</div>
				{/if}
				<Button href="/login" variant="outline" class="w-full">Volver al inicio de sesión</Button>
			</CardContent>
		</Card>
	{:else if isPasswordReset}
		<Card class="w-full max-w-md -mt-10">
			<CardHeader class="space-y-1">
				<CardTitle class="text-2xl font-semibold tracking-tight">
					{passwordUpdated ? 'Contraseña actualizada' : 'Nueva contraseña'}
				</CardTitle>
				<CardDescription>
					{#if passwordUpdated}
						Tu contraseña ha sido actualizada correctamente.
					{:else}
						Introduce tu nueva contraseña.
					{/if}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{#if passwordUpdated}
					<div class="space-y-4">
						<div
							class="flex items-center gap-3 p-4 bg-success/10 text-success rounded-lg border border-success/20"
						>
							<span class="material-symbols-rounded text-2xl!">check_circle</span>
							<p class="text-sm">Ya puedes iniciar sesión con tu nueva contraseña.</p>
						</div>
						<Button href="/login" class="w-full">Iniciar sesión</Button>
					</div>
				{:else}
					<form
						class="space-y-6"
						onsubmit={(e) => {
							e.preventDefault();
							handlePasswordUpdate();
						}}
					>
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
										if (passwordError) passwordError = null;
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
							{#if passwordError}
								<FieldError class="text-sm text-destructive">{passwordError}</FieldError>
							{/if}
						</Field>

						<Field>
							<FieldLabel>
								<Label for="confirmPassword">Confirmar contraseña</Label>
							</FieldLabel>
							<InputGroup>
								<InputGroupInput
									id="confirmPassword"
									type={showConfirmPassword ? 'text' : 'password'}
									bind:value={confirmPassword}
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
									Actualizando...
								{:else}
									Actualizar contraseña
								{/if}
							</Button>
						</CardFooter>
					</form>
				{/if}
			</CardContent>
		</Card>
	{/if}
</div>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { register, resendConfirmationEmail } from '$lib/auth';
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

	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);
	let passwordError = $state<string | null>(null);
	let confirmPasswordError = $state<string | null>(null);

	// Email confirmation state
	let emailConfirmationRequired = $state(false);
	let registeredEmail = $state('');

	// Resend confirmation state
	let isResending = $state(false);
	let resendSuccess = $state(false);
	let resendError = $state<string | null>(null);

	// Get redirect URL from query params (used when coming from invite link)
	const redirectUrl = $derived($page.url.searchParams.get('redirect'));

	const handleSubmit = async () => {
		if (isSubmitting) return;

		errorMessage = null;
		passwordError = null;
		confirmPasswordError = null;

		// Validate password length
		if (password.length < 8) {
			passwordError = 'La contraseña debe tener al menos 8 caracteres.';
			return;
		}

		// Validate password match
		if (password !== confirmPassword) {
			confirmPasswordError = 'Las contraseñas no coinciden.';
			return;
		}

		isSubmitting = true;

		try {
			const status = await register(email, password);

			// Handle email confirmation requirement
			if (status === 'EMAIL_CONFIRMATION_REQUIRED') {
				registeredEmail = email;
				emailConfirmationRequired = true;
				return;
			}

			// If there's a redirect URL (from invite), go there
			if (redirectUrl) {
				await goto(redirectUrl);
				return;
			}

			// Route based on onboarding status
			switch (status) {
				case 'ACTIVE':
					await goto('/');
					break;
				case 'ONBOARDING_REQUIRED':
					await goto('/onboarding');
					break;
				case 'PENDING_APPROVAL':
					await goto('/onboarding/status');
					break;
				default:
					await goto('/onboarding');
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se ha podido crear la cuenta';
		} finally {
			isSubmitting = false;
		}
	};

	const handleResendConfirmation = async () => {
		if (isResending || !registeredEmail) return;

		resendError = null;
		resendSuccess = false;
		isResending = true;

		try {
			await resendConfirmationEmail(registeredEmail);
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
	{#if emailConfirmationRequired}
		<Card class="w-full max-w-md -mt-10">
			<CardHeader class="space-y-1">
				<CardTitle class="text-2xl font-semibold tracking-tight">Verifica tu correo</CardTitle>
				<CardDescription>
					Te hemos enviado un correo de confirmación para completar tu registro.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-4">
					<div
						class="flex items-center gap-3 p-4 bg-success/10 text-success rounded-lg border border-success/20"
					>
						<span class="material-symbols-rounded text-2xl!">mark_email_read</span>
						<p class="text-sm">
							Revisa tu bandeja de entrada en <strong>{registeredEmail}</strong>
						</p>
					</div>
					<p class="text-sm text-muted-foreground">
						Haz clic en el enlace del correo para verificar tu cuenta y continuar con el registro.
					</p>
					<p class="text-sm text-muted-foreground">
						¿No has recibido el correo? Revisa tu carpeta de spam o solicita uno nuevo.
					</p>

					{#if resendSuccess}
						<div
							class="flex items-center gap-3 p-4 bg-primary/10 text-primary rounded-lg border border-primary/20"
						>
							<span class="material-symbols-rounded text-2xl!">check_circle</span>
							<p class="text-sm">
								Te hemos enviado un nuevo correo de confirmación.
							</p>
						</div>
					{/if}

					{#if resendError}
						<div
							class="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20"
						>
							<span class="material-symbols-rounded text-2xl!">error</span>
							<p class="text-sm">{resendError}</p>
						</div>
					{/if}
				</div>
			</CardContent>
			<CardFooter class="flex flex-col gap-4">
				<Button
					variant="default"
					class="w-full"
					disabled={isResending}
					onclick={handleResendConfirmation}
				>
					{#if isResending}
						<span class="material-symbols-rounded animate-spin text-lg! mr-2">progress_activity</span>
						Enviando...
					{:else}
						<span class="material-symbols-rounded text-lg! mr-2">send</span>
						Reenviar correo de confirmación
					{/if}
				</Button>
				<a href="/login" class="w-full">
					<Button variant="outline" class="w-full">Volver a iniciar sesión</Button>
				</a>
			</CardFooter>
		</Card>
	{:else}
		<Card class="w-full max-w-md -mt-10">
			<CardHeader class="space-y-1">
				<CardTitle class="text-2xl font-semibold tracking-tight">Crear cuenta</CardTitle>
				<CardDescription>Introduce tus datos para registrarte en la plataforma.</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					class="space-y-6"
					onsubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}
				>
					<Field>
						<FieldLabel>
							<Label for="email">Correo electrónico</Label>
						</FieldLabel>
						<Input
							id="email"
							type="email"
							placeholder="tu@ejemplo.com"
							bind:value={email}
							required
							autocomplete="email"
						/>
					</Field>

					<Field>
						<FieldLabel>
							<Label for="password">Contraseña</Label>
						</FieldLabel>
						<InputGroup>
							<InputGroupInput
								id="password"
								type={showPassword ? 'text' : 'password'}
								placeholder="Mínimo 8 caracteres"
								bind:value={password}
								required
								minlength={8}
								autocomplete="new-password"
								oninput={() => {
									if (passwordError) passwordError = null;
								}}
							/>
							<InputGroupButton
								type="button"
								onclick={() => (showPassword = !showPassword)}
								aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
							>
								<span class="material-symbols-rounded">
									{showPassword ? 'visibility_off' : 'visibility'}
								</span>
							</InputGroupButton>
						</InputGroup>
						{#if passwordError}
							<FieldError class="text-sm text-destructive">{passwordError}</FieldError>
						{/if}
					</Field>

					<Field>
						<FieldLabel>
							<Label for="confirm-password">Confirmar contraseña</Label>
						</FieldLabel>
						<InputGroup>
							<InputGroupInput
								id="confirm-password"
								type={showConfirmPassword ? 'text' : 'password'}
								placeholder="Repite tu contraseña"
								bind:value={confirmPassword}
								required
								minlength={8}
								autocomplete="new-password"
								oninput={() => {
									if (confirmPasswordError) confirmPasswordError = null;
								}}
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
						{#if confirmPasswordError}
							<FieldError class="text-sm text-destructive">{confirmPasswordError}</FieldError>
						{/if}
					</Field>

					{#if errorMessage}
						<FieldError class="text-sm text-destructive">{errorMessage}</FieldError>
					{/if}

					<CardFooter class="flex flex-col gap-4 px-0">
						<Button type="submit" class="w-full" disabled={isSubmitting}>
							{#if isSubmitting}
								Creando cuenta...
							{:else}
								Crear cuenta
							{/if}
						</Button>
						<a
							href="/login"
							class="text-sm text-muted-foreground hover:text-primary underline underline-offset-4 transition-colors text-center"
						>
							¿Ya tienes cuenta? Inicia sesión
						</a>
					</CardFooter>
				</form>
			</CardContent>
		</Card>
	{/if}
</div>

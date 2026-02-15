<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
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
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Field, FieldLabel, FieldError } from '$lib/components/ui/field';
	import { InputGroup, InputGroupInput, InputGroupButton } from '$lib/components/ui/input-group';
	import { flushPendingLegalConsents } from '$lib/api/legal-consents';
	import {
		createConsentBatch,
		LEGAL_DOCUMENTS,
		REGISTER_INFORMATION_ACKNOWLEDGEMENTS,
		REGISTER_REQUIRED_CONSENTS,
		savePendingLegalConsentBatch
	} from '$lib/legal';
	import type { RouteId } from './$types';

	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);
	let passwordError = $state<string | null>(null);
	let confirmPasswordError = $state<string | null>(null);
	let consentError = $state<string | null>(null);
	let acceptedTerms = $state(false);
	let acceptedPrivacy = $state(false);
	let acknowledgedCookies = $state(false);

	let emailConfirmationRequired = $state(false);
	let registeredEmail = $state('');

	let isResending = $state(false);
	let resendSuccess = $state(false);
	let resendError = $state<string | null>(null);

	const redirectUrl = $derived($page.url.searchParams.get('redirect')) as RouteId | null;

	const validatePassword = (pwd: string): string | null => {
		if (
			pwd.length < 8 ||
			!/[A-Z]/.test(pwd) ||
			!/[a-z]/.test(pwd) ||
			!/\d/.test(pwd) ||
			!/[^a-zA-Z0-9]/.test(pwd)
		) {
			return 'La contraseña debe contener al menos 8 caracteres, mayúscula, minúscula, número y carácter especial.';
		}

		return null;
	};

	const handleSubmit = async () => {
		if (isSubmitting) return;

		errorMessage = null;
		passwordError = null;
		confirmPasswordError = null;
		consentError = null;

		const passwordValidationError = validatePassword(password);
		if (passwordValidationError) {
			passwordError = passwordValidationError;
			return;
		}

		if (password !== confirmPassword) {
			confirmPasswordError = 'Las contraseñas no coinciden.';
			return;
		}

		if (!acceptedTerms || !acceptedPrivacy || !acknowledgedCookies) {
			consentError = 'Debes aceptar los documentos legales para continuar.';
			return;
		}

		isSubmitting = true;

		try {
			savePendingLegalConsentBatch(
				createConsentBatch('REGISTER', [
					...REGISTER_REQUIRED_CONSENTS,
					...REGISTER_INFORMATION_ACKNOWLEDGEMENTS
				])
			);

			const status = await register(email, password);

			if (status === 'EMAIL_CONFIRMATION_REQUIRED') {
				registeredEmail = email;
				emailConfirmationRequired = true;
				return;
			}

			try {
				await flushPendingLegalConsents();
			} catch (error) {
				console.warn('[legal] No se pudieron sincronizar consentimientos tras el registro', error);
			}

			if (redirectUrl) {
				await goto(resolve(redirectUrl));
				return;
			}

			switch (status) {
				case 'ACTIVE':
					await goto(resolve('/'));
					break;
				case 'ONBOARDING_REQUIRED':
					await goto(resolve('/onboarding'));
					break;
				case 'PENDING_APPROVAL':
					await goto(resolve('/onboarding/status'));
					break;
				default:
					await goto(resolve('/onboarding'));
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
				error instanceof Error
					? error.message
					: 'No se ha podido reenviar el correo de confirmación';
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
							<p class="text-sm">Te hemos enviado un nuevo correo de confirmación.</p>
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
						<span class="material-symbols-rounded animate-spin text-lg! mr-2"
							>progress_activity</span
						>
						Enviando...
					{:else}
						<span class="material-symbols-rounded text-lg! mr-2">send</span>
						Reenviar correo de confirmación
					{/if}
				</Button>
				<a href={resolve('/login')} class="w-full">
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
							placeholder="usuario@ejemplo.com"
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
								placeholder="Repite la contraseña"
								bind:value={confirmPassword}
								required
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

					<div class="space-y-3 rounded-lg border border-border p-4 bg-muted/20">
						<label class="flex items-start gap-3 text-sm">
							<Checkbox id="legal-terms" bind:checked={acceptedTerms} disabled={isSubmitting} />
							<span>
								Acepto los
								<a class="underline" href={resolve(LEGAL_DOCUMENTS.TERMS.route)}>
									{LEGAL_DOCUMENTS.TERMS.title}
								</a>
								({LEGAL_DOCUMENTS.TERMS.version}).
							</span>
						</label>

						<label class="flex items-start gap-3 text-sm">
							<Checkbox id="legal-privacy" bind:checked={acceptedPrivacy} disabled={isSubmitting} />
							<span>
								Acepto la
								<a class="underline" href={resolve(LEGAL_DOCUMENTS.PRIVACY.route)}>
									{LEGAL_DOCUMENTS.PRIVACY.title}
								</a>
								({LEGAL_DOCUMENTS.PRIVACY.version}).
							</span>
						</label>

						<label class="flex items-start gap-3 text-sm">
							<Checkbox
								id="legal-cookies"
								bind:checked={acknowledgedCookies}
								disabled={isSubmitting}
							/>
							<span>
								He leído la
								<a class="underline" href={resolve(LEGAL_DOCUMENTS.COOKIES.route)}>
									{LEGAL_DOCUMENTS.COOKIES.title}
								</a>
								({LEGAL_DOCUMENTS.COOKIES.version}).
							</span>
						</label>
					</div>

					{#if consentError}
						<FieldError class="text-sm text-destructive">{consentError}</FieldError>
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
							href={resolve('/login')}
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

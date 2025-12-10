<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { login, sendPasswordResetEmail } from '$lib/auth';
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

	const redirectUrl = $derived($page.url.searchParams.get('redirect'));
	const emailConfirmed = $derived($page.url.searchParams.get('confirmed') === '1');

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);
	let passwordError = $state<string | null>(null);

	let showForgotPassword = $state(false);
	let forgotEmail = $state('');
	let isSendingReset = $state(false);
	let resetSent = $state(false);
	let resetError = $state<string | null>(null);

	const handleSubmit = async () => {
		if (isSubmitting) return;

		errorMessage = null;
		passwordError = null;

		if (password.length > 0 && password.length < 6) {
			passwordError = 'La contraseña debe tener al menos 6 caracteres.';
			return;
		}

		isSubmitting = true;

		try {
			const status = await login(email, password);

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
					await goto(resolve('/'));
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se ha podido iniciar sesión';
		} finally {
			isSubmitting = false;
		}
	};

	const handleForgotPassword = async () => {
		if (isSendingReset) return;

		resetError = null;

		if (!forgotEmail.trim()) {
			resetError = 'Introduce tu correo electrónico';
			return;
		}

		isSendingReset = true;

		try {
			await sendPasswordResetEmail(forgotEmail.trim());
			resetSent = true;
		} catch (error) {
			resetError =
				error instanceof Error ? error.message : 'No se ha podido enviar el correo de recuperación';
		} finally {
			isSendingReset = false;
		}
	};

	const goBackToLogin = () => {
		showForgotPassword = false;
		resetSent = false;
		resetError = null;
		forgotEmail = '';
	};
</script>

<div class="grow flex items-center justify-center bg-background px-4">
	{#if showForgotPassword}
		<Card class="w-full max-w-md -mt-10">
			<CardHeader class="space-y-1">
				<CardTitle class="text-2xl font-semibold tracking-tight">Recuperar contraseña</CardTitle>
				<CardDescription>
					{#if resetSent}
						Te hemos enviado un correo con instrucciones para restablecer tu contraseña.
					{:else}
						Introduce tu correo electrónico y te enviaremos un enlace para restablecer tu
						contraseña.
					{/if}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{#if resetSent}
					<div class="space-y-4">
						<div
							class="flex items-center gap-3 p-4 bg-success/10 text-success rounded-lg border border-success/20"
						>
							<span class="material-symbols-rounded text-2xl!">check_circle</span>
							<p class="text-sm">
								Revisa tu bandeja de entrada en <strong>{forgotEmail}</strong>
							</p>
						</div>
						<Button variant="outline" class="w-full" onclick={goBackToLogin}>
							Volver a iniciar sesión
						</Button>
					</div>
				{:else}
					<form
						class="space-y-6"
						onsubmit={(e) => {
							e.preventDefault();
							handleForgotPassword();
						}}
					>
						<Field>
							<FieldLabel>
								<Label for="forgot-email">Correo electrónico</Label>
							</FieldLabel>
							<Input
								id="forgot-email"
								type="email"
								placeholder="tu@ejemplo.com"
								bind:value={forgotEmail}
								required
								autocomplete="email"
							/>
						</Field>

						{#if resetError}
							<FieldError class="text-sm text-destructive">{resetError}</FieldError>
						{/if}

						<CardFooter class="flex flex-col gap-4 px-0">
							<Button type="submit" class="w-full" disabled={isSendingReset}>
								{#if isSendingReset}
									Enviando...
								{:else}
									Enviar enlace de recuperación
								{/if}
							</Button>
							<Button variant="ghost" class="w-full" onclick={goBackToLogin} type="button">
								Volver a iniciar sesión
							</Button>
						</CardFooter>
					</form>
				{/if}
			</CardContent>
		</Card>
	{:else}
		<Card class="w-full max-w-md -mt-10">
			<CardHeader class="space-y-1">
				<CardTitle class="text-2xl font-semibold tracking-tight">Iniciar sesión</CardTitle>
				<CardDescription>Introduce tus credenciales para acceder a tu cuenta.</CardDescription>
			</CardHeader>
			<CardContent>
				{#if emailConfirmed}
					<div
						class="flex items-center gap-3 p-4 mb-6 bg-success/10 text-success rounded-lg border border-success/20"
					>
						<span class="material-symbols-rounded text-2xl!">check_circle</span>
						<p class="text-sm">Tu correo electrónico ha sido confirmado. Ya puedes iniciar sesión.</p>
					</div>
				{/if}
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
								placeholder="Introduce tu contraseña"
								bind:value={password}
								required
								minlength={6}
								autocomplete="current-password"
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

					{#if errorMessage}
						<FieldError class="text-sm text-destructive">{errorMessage}</FieldError>
					{/if}

					<CardFooter class="flex flex-col gap-4 px-0">
						<Button type="submit" class="w-full" disabled={isSubmitting}>
							{#if isSubmitting}
								Iniciando sesión...
							{:else}
								Iniciar sesión
							{/if}
						</Button>
						<button
							type="button"
							class="text-sm text-muted-foreground hover:text-primary underline underline-offset-4 transition-colors"
							onclick={() => (showForgotPassword = true)}
						>
							¿Has olvidado tu contraseña?
						</button>

						<div class="relative w-full">
							<div class="absolute inset-0 flex items-center">
								<span class="w-full border-t border-muted"></span>
							</div>
							<div class="relative flex justify-center text-xs uppercase">
								<span class="bg-card px-2 text-muted-foreground">¿Nuevo aquí?</span>
							</div>
						</div>

						<a
							href={`/register${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}

							class="w-full"
						>
							<Button variant="outline" class="w-full gap-2" type="button">
								<span class="material-symbols-rounded text-lg!">person_add</span>
								Crear una cuenta
							</Button>
						</a>
					</CardFooter>
				</form>
			</CardContent>
		</Card>
	{/if}
</div>

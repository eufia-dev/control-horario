<script lang="ts">
	import { goto } from '$app/navigation';
	import { login } from '$lib/auth';
	import { mustChangePassword } from '$lib/stores/auth';
	import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Field, FieldLabel, FieldDescription, FieldError } from '$lib/components/ui/field';
	import { InputGroup, InputGroupInput, InputGroupButton } from '$lib/components/ui/input-group';
	import { onDestroy } from 'svelte';

	let email = '';
	let password = '';
	let showPassword = false;
	let isSubmitting = false;
	let errorMessage: string | null = null;
	let passwordError: string | null = null;

	let mustChangePasswordUnsubscribe: () => void;
	let currentMustChangePassword = false;

	mustChangePasswordUnsubscribe = mustChangePassword.subscribe((value) => {
		currentMustChangePassword = value;
	});

	onDestroy(() => {
		mustChangePasswordUnsubscribe?.();
	});

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
			const user = await login(email, password);

			console.log(user);
			console.log(currentMustChangePassword);

			if (user.mustChangePassword || currentMustChangePassword) {
				console.log('redirecting to reset password');
				await goto('/reset-password');
			} else {
				await goto('/');
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se ha podido iniciar sesión';
		} finally {
			isSubmitting = false;
		}
	};
</script>

<div class="min-h-screen flex items-center justify-center bg-background px-4">
	<Card class="w-full max-w-md">
		<CardHeader class="space-y-1">
			<CardTitle class="text-2xl font-semibold tracking-tight">Iniciar sesión</CardTitle>
			<CardDescription>Introduce tus credenciales para acceder a tu cuenta.</CardDescription>
		</CardHeader>
		<CardContent>
			<form class="space-y-6" on:submit|preventDefault={handleSubmit}>
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
					<p class="text-sm text-muted-foreground text-center">
						<a href="/reset-password" class="text-primary underline underline-offset-4 hover:text-primary/80">Cambiar contraseña</a>
					</p>
				</CardFooter>
			</form>
		</CardContent>
	</Card>
</div>



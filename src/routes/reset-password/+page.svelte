<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { sendPasswordResetEmail } from '$lib/auth';
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

	let email = $state('');
	let isSending = $state(false);
	let errorMessage = $state<string | null>(null);
	let emailSent = $state(false);

	const handleSubmit = async () => {
		if (isSending) return;

		errorMessage = null;

		if (!email.trim()) {
			errorMessage = 'Introduce tu correo electrónico';
			return;
		}

		isSending = true;

		try {
			await sendPasswordResetEmail(email.trim());
			emailSent = true;
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'No se ha podido enviar el correo de recuperación';
		} finally {
			isSending = false;
		}
	};
</script>

<div class="grow flex items-center justify-center bg-background px-4">
	<div class="flex flex-col w-full max-w-md items-start gap-2 -mt-16">
		<Button
			variant="ghost"
			size="sm"
			aria-label="Volver al inicio de sesión"
			onclick={() => goto(resolve('/login'))}
			class="text-muted-foreground"
		>
			<span class="material-symbols-rounded text-xl!">arrow_back</span>
			Volver al inicio de sesión
		</Button>
		<Card class="w-full">
			<CardHeader class="space-y-1">
				<CardTitle class="text-2xl font-semibold tracking-tight">Recuperar contraseña</CardTitle>
				<CardDescription>
					{#if emailSent}
						Te hemos enviado un correo con instrucciones para restablecer tu contraseña.
					{:else}
						Introduce tu correo electrónico y te enviaremos un enlace para restablecer tu
						contraseña.
					{/if}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{#if emailSent}
					<div class="space-y-4">
						<div
							class="flex items-center gap-3 p-4 bg-success/10 text-success rounded-lg border border-success/20"
						>
							<span class="material-symbols-rounded text-2xl!">check_circle</span>
							<div>
								<p class="text-sm font-medium">Correo enviado</p>
								<p class="text-sm opacity-80">
									Revisa tu bandeja de entrada en <strong>{email}</strong>
								</p>
							</div>
						</div>
						<p class="text-sm text-muted-foreground">
							¿No has recibido el correo? Revisa tu carpeta de spam o
							<button
								type="button"
								class="text-primary underline underline-offset-4 hover:text-primary/80"
								onclick={() => {
									emailSent = false;
									errorMessage = null;
								}}
							>
								intenta de nuevo
							</button>
						</p>
					</div>
				{:else}
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

						{#if errorMessage}
							<FieldError class="text-sm text-destructive">{errorMessage}</FieldError>
						{/if}

						<CardFooter class="px-0">
							<Button type="submit" class="w-full" disabled={isSending}>
								{#if isSending}
									Enviando...
								{:else}
									Enviar enlace de recuperación
								{/if}
							</Button>
						</CardFooter>
					</form>
				{/if}
			</CardContent>
		</Card>
	</div>
</div>

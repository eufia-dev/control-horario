<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { submitContactMessage } from '$lib/api/support';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';

	let subject = $state('');
	let message = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);

	async function handleSubmit() {
		error = null;
		success = false;

		if (!subject.trim()) {
			error = 'El asunto es obligatorio';
			return;
		}

		if (!message.trim()) {
			error = 'El mensaje es obligatorio';
			return;
		}

		submitting = true;

		try {
			await submitContactMessage({
				subject: subject.trim(),
				message: message.trim()
			});

			success = true;
			// Reset form
			subject = '';
			message = '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al enviar el mensaje';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="grow flex items-center justify-center bg-background px-4 py-8">
	<div class="flex flex-col w-full max-w-2xl items-start gap-4">
		<Button
			variant="ghost"
			size="sm"
			aria-label="Volver al inicio"
			onclick={() => goto(resolve('/'))}
			class="text-muted-foreground"
		>
			<span class="material-symbols-rounded text-xl!">arrow_back</span>
			Volver al inicio
		</Button>

		<Card class="w-full">
			<CardHeader>
				<CardTitle>Contactar con soporte</CardTitle>
				<CardDescription>
					Envía un mensaje a <strong>support@eufia.eu</strong> y te responderemos lo antes posible
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}
					class="space-y-6"
				>
					<div class="grid gap-2">
						<Label for="subject">Asunto</Label>
						<Input
							id="subject"
							bind:value={subject}
							placeholder="¿En qué podemos ayudarte?"
							disabled={submitting}
							required
						/>
					</div>

					<div class="grid gap-2">
						<Label for="message">Mensaje</Label>
						<Textarea
							id="message"
							bind:value={message}
							placeholder="Escribe tu mensaje aquí..."
							disabled={submitting}
							rows={8}
							required
						/>
					</div>

					{#if error}
						<div class="text-sm text-destructive text-center p-3 bg-destructive/10 rounded-md">
							{error}
						</div>
					{/if}

					{#if success}
						<div
							class="text-sm text-green-600 dark:text-green-400 text-center p-3 bg-green-50 dark:bg-green-950 rounded-md"
						>
							¡Mensaje enviado correctamente! Te responderemos pronto a tu correo electrónico.
						</div>
					{/if}

					<div class="flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							onclick={() => goto(resolve('/'))}
							disabled={submitting}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={submitting}>
							{#if submitting}
								<span class="material-symbols-rounded animate-spin text-lg!">progress_activity</span
								>
							{:else}
								<span class="material-symbols-rounded text-lg!">send</span>
							{/if}
							Enviar mensaje
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	</div>
</div>

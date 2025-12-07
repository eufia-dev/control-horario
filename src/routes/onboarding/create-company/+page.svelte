<script lang="ts">
	import { goto } from '$app/navigation';
	import { createCompany } from '$lib/api/onboarding';
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
	import { Field, FieldLabel, FieldError, FieldDescription } from '$lib/components/ui/field';
	import OnboardingSteps from '$lib/components/onboarding-steps.svelte';

	const steps = [{ label: 'Elige una opción', completed: true }, { label: 'Crea tu empresa' }];

	let companyName = $state('');
	let cif = $state('');
	let userName = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	const handleSubmit = async () => {
		if (isSubmitting) return;

		errorMessage = null;

		if (!companyName.trim()) {
			errorMessage = 'El nombre de la empresa es obligatorio';
			return;
		}

		if (!userName.trim()) {
			errorMessage = 'Tu nombre es obligatorio';
			return;
		}

		isSubmitting = true;

		try {
			const result = await createCompany({
				companyName: companyName.trim(),
				cif: cif.trim() || undefined,
				userName: userName.trim()
			});

			if (result.status === 'ACTIVE' && result.user) {
				auth.setUser(result.user);
				await goto('/');
			} else {
				errorMessage = 'Error inesperado al crear la empresa';
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Error al crear la empresa';
		} finally {
			isSubmitting = false;
		}
	};
</script>

<div class="grow flex items-center justify-center bg-background px-4 py-8">
	<div class="w-full max-w-lg">
		<OnboardingSteps {steps} currentStep={1} />

		<Card>
			<CardHeader>
				<CardTitle class="text-xl flex items-center gap-2">
					<span class="material-symbols-rounded text-primary">add_business</span>
					Crear nueva empresa
				</CardTitle>
				<CardDescription>
					Configura tu empresa para comenzar a gestionar el control horario de tu equipo
				</CardDescription>
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
							<Label for="company-name">Nombre de la empresa *</Label>
						</FieldLabel>
						<Input
							id="company-name"
							type="text"
							placeholder="Mi Empresa S.L."
							bind:value={companyName}
							required
						/>
					</Field>

					<Field>
						<FieldLabel>
							<Label for="cif">CIF / NIF (opcional)</Label>
						</FieldLabel>
						<Input id="cif" type="text" placeholder="B12345678" bind:value={cif} />
						<FieldDescription class="text-xs text-muted-foreground">
							Identificador fiscal de la empresa
						</FieldDescription>
					</Field>

					<Field>
						<FieldLabel>
							<Label for="user-name">Tu nombre *</Label>
						</FieldLabel>
						<Input
							id="user-name"
							type="text"
							placeholder="Juan García"
							bind:value={userName}
							required
						/>
						<FieldDescription class="text-xs text-muted-foreground">
							Nombre que aparecerá en tu perfil
						</FieldDescription>
					</Field>

					{#if errorMessage}
						<FieldError class="text-sm text-destructive">{errorMessage}</FieldError>
					{/if}

					<CardFooter class="flex justify-between px-0 pt-4">
						<Button variant="ghost" onclick={() => goto('/onboarding')} type="button">
							<span class="material-symbols-rounded text-lg! mr-2">arrow_back</span>
							Volver
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{#if isSubmitting}
								Creando empresa...
							{:else}
								Crear empresa
							{/if}
						</Button>
					</CardFooter>
				</form>
			</CardContent>
		</Card>
	</div>
</div>

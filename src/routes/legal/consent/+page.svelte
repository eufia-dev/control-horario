<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent
	} from '$lib/components/ui/card';
	import { FieldError } from '$lib/components/ui/field';
	import {
		acceptLegalConsents,
		checkLegalConsentStatus,
		type LegalRequiredDocument
	} from '$lib/api/legal-consents';
	import { LEGAL_DOCUMENTS, type LegalDocumentType } from '$lib/legal';

	let isLoading = $state(true);
	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);
	let canEvaluate = $state(true);
	let requiredDocs = $state<LegalRequiredDocument[]>([]);
	let acceptedMap = $state<Record<LegalDocumentType, boolean>>({
		TERMS: false,
		PRIVACY: false,
		COOKIES: false,
		AVISO_LEGAL: false,
		DPA: false
	});

	function initializeAcceptedMap(documents: LegalRequiredDocument[]) {
		acceptedMap = {
			TERMS: false,
			PRIVACY: false,
			COOKIES: false,
			AVISO_LEGAL: false,
			DPA: false
		};
		for (const document of documents) {
			acceptedMap[document.documentType] = false;
		}
	}

	async function loadStatus() {
		isLoading = true;
		errorMessage = null;
		try {
			const status = await checkLegalConsentStatus();
			canEvaluate = status.canEvaluate;
			if (!status.canEvaluate) {
				errorMessage =
					'No hemos podido validar tus consentimientos ahora mismo. Puedes continuar y reintentar más tarde.';
				requiredDocs = [];
				return;
			}

			if (status.isCompliant) {
				await goto(resolve('/'));
				return;
			}

			requiredDocs = status.missing;
			initializeAcceptedMap(requiredDocs);
		} catch (error) {
			errorMessage =
				error instanceof Error
					? error.message
					: 'No se pudo cargar el estado legal. Inténtalo de nuevo.';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		loadStatus();
	});

	async function handleSubmit() {
		if (isSubmitting || requiredDocs.length === 0) return;

		errorMessage = null;
		const pending = requiredDocs.filter((doc) => !acceptedMap[doc.documentType]);
		if (pending.length > 0) {
			errorMessage = 'Debes aceptar todos los documentos requeridos para continuar.';
			return;
		}

		isSubmitting = true;
		try {
			await acceptLegalConsents({
				source: 'RECONSENT',
				consents: requiredDocs.map((doc) => ({
					documentType: doc.documentType,
					version: doc.version
				}))
			});
			await goto(resolve('/'));
		} catch (error) {
			errorMessage =
				error instanceof Error
					? error.message
					: 'No hemos podido registrar tu aceptación en este momento.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="grow flex items-center justify-center bg-background px-4 py-8">
	<Card class="w-full max-w-2xl">
		<CardHeader class="space-y-2">
			<CardTitle class="text-2xl font-semibold tracking-tight">
				Actualización de documentos legales
			</CardTitle>
			<CardDescription>
				Para seguir usando la plataforma debes aceptar las versiones vigentes de los documentos
				aplicables.
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-6">
			{#if isLoading}
				<div class="flex items-center gap-2 text-muted-foreground text-sm">
					<span class="material-symbols-rounded animate-spin text-lg!">progress_activity</span>
					Comprobando estado legal...
				</div>
			{:else if !canEvaluate}
				<div class="space-y-4">
					{#if errorMessage}
						<FieldError class="text-sm text-destructive">{errorMessage}</FieldError>
					{/if}
					<Button onclick={() => goto(resolve('/'))}>Continuar</Button>
				</div>
			{:else}
				<form
					class="space-y-5"
					onsubmit={(event) => {
						event.preventDefault();
						handleSubmit();
					}}
				>
					<div class="space-y-3">
						{#each requiredDocs as doc (doc.documentType)}
							<label class="flex items-start gap-3 p-3 rounded-md border border-border bg-muted/20">
								<Checkbox
									id={`reconsent-${doc.documentType.toLowerCase()}`}
									bind:checked={acceptedMap[doc.documentType]}
									disabled={isSubmitting}
								/>
								<span class="text-sm text-foreground">
									Acepto <a
										class="underline"
										href={resolve(LEGAL_DOCUMENTS[doc.documentType].route)}
										>{LEGAL_DOCUMENTS[doc.documentType].title}</a
									>
									({doc.version}).
								</span>
							</label>
						{/each}
					</div>

					{#if errorMessage}
						<FieldError class="text-sm text-destructive">{errorMessage}</FieldError>
					{/if}

					<div class="flex items-center justify-end gap-2">
						<Button type="button" variant="outline" onclick={loadStatus} disabled={isSubmitting}>
							Reintentar
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{#if isSubmitting}
								<span class="material-symbols-rounded animate-spin text-lg! mr-2"
									>progress_activity</span
								>
								Guardando...
							{:else}
								Aceptar y continuar
							{/if}
						</Button>
					</div>
				</form>
			{/if}
		</CardContent>
	</Card>
</div>

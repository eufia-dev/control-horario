<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { RouteId } from './$types';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import {
		searchCompanies,
		getCompanyByCode,
		requestJoin,
		type CompanySearchResult
	} from '$lib/api/onboarding';
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
	import { Separator } from '$lib/components/ui/separator';
	import OnboardingSteps from '$lib/components/OnboardingSteps.svelte';

	const steps = [
		{ label: 'Tu perfil', completed: true },
		{ label: 'Elige una opción', completed: true },
		{ label: 'Únete a una empresa' }
	];

	let searchQuery = $state('');
	let searchResults = $state<CompanySearchResult[]>([]);
	let isSearching = $state(false);
	let searchError = $state<string | null>(null);
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	let inviteCode = $state('');
	let codeCompany = $state<CompanySearchResult | null>(null);
	let isCheckingCode = $state(false);
	let codeError = $state<string | null>(null);

	let selectedCompany = $state<CompanySearchResult | null>(null);

	let userName = $derived($page.url.searchParams.get('userName') ?? '');
	let isSubmitting = $state(false);
	let submitError = $state<string | null>(null);

	onMount(() => {
		if (!userName.trim()) {
			goto(resolve('/onboarding'));
		}
	});

	const handleSearchInput = (value: string) => {
		searchQuery = value;
		searchError = null;

		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		if (value.trim().length < 2) {
			searchResults = [];
			return;
		}

		searchTimeout = setTimeout(async () => {
			isSearching = true;
			try {
				searchResults = await searchCompanies(value.trim());
			} catch (error) {
				searchError = error instanceof Error ? error.message : 'Error al buscar empresas';
				searchResults = [];
			} finally {
				isSearching = false;
			}
		}, 300);
	};

	const handleCheckCode = async () => {
		if (!inviteCode.trim()) return;

		isCheckingCode = true;
		codeError = null;
		codeCompany = null;

		try {
			codeCompany = await getCompanyByCode(inviteCode.trim());
		} catch (error) {
			codeError = error instanceof Error ? error.message : 'Código no válido';
		} finally {
			isCheckingCode = false;
		}
	};

	const handleSelectCompany = (company: CompanySearchResult) => {
		selectedCompany = company;
		submitError = null;
	};

	const handleSubmitRequest = async () => {
		if (!selectedCompany || isSubmitting) return;

		const trimmedName = userName.trim();

		if (!trimmedName) {
			submitError = 'Tu nombre es obligatorio';
			return;
		}

		isSubmitting = true;
		submitError = null;

		try {
			await requestJoin({
				companyId: selectedCompany.id,
				name: trimmedName
			});
			await goto(resolve('/onboarding/status'));
		} catch (error) {
			submitError = error instanceof Error ? error.message : 'Error al enviar la solicitud';
		} finally {
			isSubmitting = false;
		}
	};

	const handleClearSelection = () => {
		selectedCompany = null;
		submitError = null;
	};
</script>

<div class="grow flex items-center justify-center bg-background px-4 py-8">
	<div class="w-full max-w-lg">
		<OnboardingSteps {steps} currentStep={2} />

		{#if selectedCompany}
			<Card>
				<CardHeader>
					<CardTitle class="text-xl flex items-center gap-2">
						<span class="material-symbols-rounded text-primary">group_add</span>
						Solicitar unirse
					</CardTitle>
					<CardDescription>
						Envía una solicitud para unirte a <strong>{selectedCompany.name}</strong>
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						class="space-y-6"
						onsubmit={(e) => {
							e.preventDefault();
							handleSubmitRequest();
						}}
					>
						<div class="p-4 rounded-lg bg-muted/50 border border-border">
							<div class="flex items-center gap-3">
								<div
									class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary"
								>
									<span class="material-symbols-rounded">business</span>
								</div>
								<div>
									<p class="font-medium">{selectedCompany.name}</p>
									<p class="text-sm text-muted-foreground">Empresa seleccionada</p>
								</div>
							</div>
						</div>

						<div class="p-4 rounded-lg bg-muted/70 border border-dashed border-border">
							<p class="text-sm text-muted-foreground">
								Usaremos el nombre que indicaste en el paso anterior:
							</p>
							<p class="font-medium mt-1">{userName}</p>
							<p class="text-xs text-muted-foreground mt-1">
								Este nombre será visible para el administrador de la empresa.
							</p>
						</div>

						{#if submitError}
							<FieldError class="text-sm text-destructive">{submitError}</FieldError>
						{/if}

						<div
							class="flex items-center gap-3 p-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-500/20"
						>
							<span class="material-symbols-rounded text-xl!">info</span>
							<p class="text-sm">
								Tu solicitud será revisada por un administrador de la empresa. Te notificaremos
								cuando sea aprobada.
							</p>
						</div>

						<CardFooter class="flex justify-between px-0 pt-4">
							<Button variant="ghost" onclick={handleClearSelection} type="button">
								<span class="material-symbols-rounded text-lg! mr-2">arrow_back</span>
								Cambiar empresa
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{#if isSubmitting}
									Enviando solicitud...
								{:else}
									Enviar solicitud
								{/if}
							</Button>
						</CardFooter>
					</form>
				</CardContent>
			</Card>
		{:else}
			<Card>
				<CardHeader>
					<CardTitle class="text-xl flex items-center gap-2">
						<span class="material-symbols-rounded text-primary">search</span>
						Buscar empresa
					</CardTitle>
					<CardDescription>
						Busca una empresa por nombre o introduce un código de invitación
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-6">
					<!-- Search by name -->
					<Field>
						<FieldLabel>
							<Label for="search">Buscar por nombre</Label>
						</FieldLabel>
						<div class="relative">
							<Input
								id="search"
								type="text"
								placeholder="Nombre de la empresa..."
								value={searchQuery}
								oninput={(e) => handleSearchInput(e.currentTarget.value)}
							/>
							{#if isSearching}
								<div class="absolute right-3 top-1/2 -translate-y-1/2">
									<span class="material-symbols-rounded animate-spin text-muted-foreground"
										>progress_activity</span
									>
								</div>
							{/if}
						</div>
						{#if searchError}
							<FieldError class="text-sm text-destructive">{searchError}</FieldError>
						{/if}
					</Field>

					{#if searchResults.length > 0}
						<div class="space-y-2">
							<p class="text-sm text-muted-foreground">
								{searchResults.length} empresa{searchResults.length !== 1 ? 's' : ''} encontrada{searchResults.length !==
								1
									? 's'
									: ''}
							</p>
							<div class="space-y-2 max-h-48 overflow-y-auto">
								{#each searchResults as company (company.id)}
									<button
										type="button"
										class="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-colors text-left"
										onclick={() => handleSelectCompany(company)}
									>
										<div
											class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0"
										>
											<span class="material-symbols-rounded">business</span>
										</div>
										<span class="font-medium">{company.name}</span>
									</button>
								{/each}
							</div>
						</div>
					{:else if searchQuery.trim().length >= 2 && !isSearching}
						<p class="text-sm text-muted-foreground text-center py-4">
							No se encontraron empresas con ese nombre
						</p>
					{/if}

					<div class="relative">
						<Separator />
						<span
							class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-sm text-muted-foreground"
						>
							o
						</span>
					</div>

					<Field>
						<FieldLabel>
							<Label for="invite-code">Código de invitación</Label>
						</FieldLabel>
						<div class="flex gap-2">
							<Input
								id="invite-code"
								type="text"
								placeholder="ABC123"
								bind:value={inviteCode}
								class="flex-1"
							/>
							<Button
								type="button"
								variant="secondary"
								onclick={handleCheckCode}
								disabled={isCheckingCode || !inviteCode.trim()}
							>
								{#if isCheckingCode}
									<span class="material-symbols-rounded animate-spin">progress_activity</span>
								{:else}
									Verificar
								{/if}
							</Button>
						</div>
						{#if codeError}
							<FieldError class="text-sm text-destructive">{codeError}</FieldError>
						{/if}
					</Field>

					{#if codeCompany}
						<div class="space-y-2">
							<p class="text-sm text-muted-foreground">Empresa encontrada:</p>
							<button
								type="button"
								class="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors text-left"
								onclick={() => handleSelectCompany(codeCompany!)}
							>
								<div
									class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0"
								>
									<span class="material-symbols-rounded">business</span>
								</div>
								<div>
									<span class="font-medium">{codeCompany.name}</span>
									<p class="text-sm text-muted-foreground">Clic para seleccionar</p>
								</div>
							</button>
						</div>
					{/if}

					<CardFooter class="flex justify-start px-0 pt-4">
						<Button
							variant="ghost"
							onclick={() => {
								const target = userName.trim()
									? `/onboarding?userName=${encodeURIComponent(userName.trim())}`
									: '/onboarding';
								goto(resolve(target as RouteId));
							}}
						>
							<span class="material-symbols-rounded text-lg! mr-2">arrow_back</span>
							Volver
						</Button>
					</CardFooter>
				</CardContent>
			</Card>
		{/if}
	</div>
</div>

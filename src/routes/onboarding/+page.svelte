<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth';
	import {
		acceptInvitation,
		createCompany,
		// getCompanyByCode,
		requestJoin,
		searchCompanies,
		type CompanySearchResult
	} from '$lib/api/onboarding';
	import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Field, FieldLabel, FieldError, FieldDescription } from '$lib/components/ui/field';
	import { Carousel, CarouselContent, CarouselItem } from '$lib/components/ui/carousel';
	import OnboardingSteps from '$lib/components/onboarding-steps.svelte';
	import { fade } from 'svelte/transition';
	import type { CarouselAPI } from '$lib/components/ui/carousel/context';

	const steps = [{ label: 'Tu perfil' }, { label: 'Elige una opción' }, { label: 'Completa' }];

	let selectedPath = $state<'create' | 'join' | ''>('');
	let pendingInvitations = $state<typeof $auth.pendingInvitations>([]);
	let isAcceptingInvitation = $state(false);
	let acceptingInvitationId = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let userName = $state($page.url.searchParams.get('userName') ?? '');
	let showOtherOptions = $state(false);
	let userToggledOptions = $state(false);
	let stage = $state(0);
	let carouselApi = $state<CarouselAPI | undefined>(undefined);

	let companyName = $state('');
	let cif = $state('');
	let createError = $state<string | null>(null);
	let isSubmittingCreate = $state(false);

	let searchQuery = $state('');
	let searchResults = $state<CompanySearchResult[]>([]);
	let isSearching = $state(false);
	let searchError = $state<string | null>(null);
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	// let inviteCode = $state('');
	// let codeCompany = $state<CompanySearchResult | null>(null);
	// let isCheckingCode = $state(false);
	// let codeError = $state<string | null>(null);

	let selectedCompany = $state<CompanySearchResult | null>(null);
	let joinError = $state<string | null>(null);
	let isSubmittingJoin = $state(false);

	$effect(() => {
		const unsub = auth.subscribe((state) => {
			pendingInvitations = state.pendingInvitations;
			if (!userName.trim() && state.user?.name) {
				userName = state.user.name;
			}
			if (!userToggledOptions) {
				showOtherOptions = state.pendingInvitations.length === 0;
			}
		});
		return unsub;
	});

	const handleCreateSubmit = async () => {
		if (isSubmittingCreate) return;

		createError = null;

		if (!companyName.trim()) {
			createError = 'El nombre de la empresa es obligatorio';
			return;
		}

		const trimmedUserName = userName.trim();
		if (!trimmedUserName) {
			createError = 'Tu nombre es obligatorio';
			stage = 0;
			carouselApi?.scrollTo(0);
			return;
		}

		isSubmittingCreate = true;

		try {
			const result = await createCompany({
				companyName: companyName.trim(),
				cif: cif.trim() || undefined,
				userName: trimmedUserName
			});

			if (result.status === 'ACTIVE' && result.user) {
				auth.setUser(result.user);
				await goto('/');
			} else {
				createError = 'Error inesperado al crear la empresa';
			}
		} catch (error) {
			createError = error instanceof Error ? error.message : 'Error al crear la empresa';
		} finally {
			isSubmittingCreate = false;
		}
	};

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

	// const handleCheckCode = async () => {
	// 	if (!inviteCode.trim()) return;

	// 	isCheckingCode = true;
	// 	codeError = null;
	// 	codeCompany = null;

	// 	try {
	// 		codeCompany = await getCompanyByCode(inviteCode.trim());
	// 		if (codeCompany) {
	// 			selectedCompany = codeCompany;
	// 			joinError = null;
	// 		}
	// 	} catch (error) {
	// 		codeError = error instanceof Error ? error.message : 'Código no válido';
	// 	} finally {
	// 		isCheckingCode = false;
	// 	}
	// };

	const handleSelectCompany = (company: CompanySearchResult) => {
		selectedCompany = company;
		joinError = null;
	};

	const handleJoinSubmit = async () => {
		if (!selectedCompany || isSubmittingJoin) return;

		const trimmedName = userName.trim();
		if (!trimmedName) {
			joinError = 'Tu nombre es obligatorio';
			stage = 0;
			carouselApi?.scrollTo(0);
			return;
		}

		isSubmittingJoin = true;
		joinError = null;

		try {
			await requestJoin({
				companyId: selectedCompany.id,
				name: trimmedName
			});
			await goto('/onboarding/status');
		} catch (error) {
			joinError = error instanceof Error ? error.message : 'Error al enviar la solicitud';
		} finally {
			isSubmittingJoin = false;
		}
	};

	$effect(() => {
		if (!carouselApi) return;

		const syncStage = () => {
			stage = carouselApi?.selectedScrollSnap() ?? 0;
		};

		carouselApi.on('select', syncStage);
		syncStage();

		return () => {
			carouselApi?.off('select', syncStage);
		};
	});

	const handleAcceptInvitation = async (token: string, invitationId: string) => {
		if (isAcceptingInvitation) return;

		if (!userName.trim()) {
			errorMessage = 'Tu nombre es obligatorio para aceptar la invitación';
			return;
		}

		isAcceptingInvitation = true;
		acceptingInvitationId = invitationId;
		errorMessage = null;

		try {
			await acceptInvitation(token, userName.trim());
			await goto('/');
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Error al aceptar la invitación';
		} finally {
			isAcceptingInvitation = false;
			acceptingInvitationId = null;
		}
	};

	const handleContinue = () => {
		if (stage === 0) {
			if (!userName.trim()) {
				errorMessage = 'Tu nombre es obligatorio para continuar';
				return;
			}
			errorMessage = null;
			stage = 1;
			carouselApi?.scrollTo(1);
			return;
		}

		if (stage === 1) {
			if (!selectedPath) {
				errorMessage = 'Selecciona una opción para continuar';
				return;
			}
			errorMessage = null;
			stage = 2;
			carouselApi?.scrollTo(2);
			return;
		}

		if (!userName.trim()) {
			errorMessage = 'Tu nombre es obligatorio para continuar';
			stage = 0;
			carouselApi?.scrollTo(0);
			return;
		}

		errorMessage = null;
	};
</script>

<div class="grow flex items-center justify-center bg-background px-4 py-8">
	<div class="w-full max-w-2xl space-y-6">
		<OnboardingSteps {steps} currentStep={stage} />

		<Carousel
			class="w-full"
			opts={{ align: 'start', duration: 20 }}
			setApi={(api) => {
				carouselApi = api;
			}}
		>
			<CarouselContent class="w-full items-start">
				<CarouselItem class="flex justify-center">
					<Card class="shadow-lg max-w-xl w-full">
						<CardHeader>
							<CardTitle class="text-xl flex items-center gap-2">
								<span class="material-symbols-rounded text-primary">badge</span>
								Perfil
							</CardTitle>
						</CardHeader>
						<CardContent class="space-y-4">
							<Field>
								<FieldLabel>
									<Label for="user-name">Nombre *</Label>
								</FieldLabel>
								<Input
									id="user-name"
									type="text"
									placeholder="Juan García"
									bind:value={userName}
									autocomplete="name"
								/>
								{#if errorMessage && !userName.trim()}
									<FieldError class="text-sm">{errorMessage}</FieldError>
								{/if}
							</Field>
						</CardContent>
						<CardFooter class="flex justify-end gap-3">
							<Button onclick={handleContinue} disabled={!userName.trim()}>
								Siguiente
								<span class="material-symbols-rounded text-lg! ml-2">arrow_forward</span>
							</Button>
						</CardFooter>
					</Card>
				</CarouselItem>

				<CarouselItem class="flex justify-center">
					<Card class="shadow-lg max-w-xl w-full">
						<CardContent class="space-y-6">
							{#if pendingInvitations.length === 0}
								<div class="text-center py-4">
									<span class="material-symbols-rounded text-4xl text-muted-foreground/50 mb-2"
										>mail</span
									>
									<p class="text-sm text-muted-foreground">
										No encontramos invitaciones pendientes en tu cuenta.
									</p>
								</div>
							{:else}
								<div>
									{#each pendingInvitations as invitation (invitation.id)}
										<div
											class="relative rounded-xl border-2 border-primary/20 bg-primary/3 p-5 transition-all hover:border-primary/40"
										>
											<div class="flex items-center gap-4">
												<div
													class="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary shrink-0"
												>
													<span class="material-symbols-rounded text-2xl!">domain</span>
												</div>
												<div class="flex-1 min-w-0">
													<h3 class="text-lg font-semibold text-foreground truncate">
														{invitation.companyName}
													</h3>
													<p class="text-sm text-muted-foreground">
														Te invitaron a unirte a esta empresa
													</p>
												</div>
												<Button
													size="lg"
													onclick={() => handleAcceptInvitation(invitation.token, invitation.id)}
													disabled={isAcceptingInvitation}
													class="shrink-0"
												>
													{#if isAcceptingInvitation && acceptingInvitationId === invitation.id}
														<span class="material-symbols-rounded animate-spin mr-2"
															>progress_activity</span
														>
														Aceptando...
													{:else}
														<span class="material-symbols-rounded mr-2">check_circle</span>
														Aceptar
													{/if}
												</Button>
											</div>
										</div>
									{/each}
								</div>
							{/if}
							{#if errorMessage}
								<p class="text-sm text-destructive">{errorMessage}</p>
							{/if}

							<div class="relative">
								<div class="absolute inset-0 flex items-center">
									<div class="w-full border-t border-border"></div>
								</div>
								<div class="relative flex justify-center">
									<span class="bg-card px-3 text-xs text-muted-foreground uppercase tracking-wider"
										>o bien</span
									>
								</div>
							</div>

							<div class="-mt-2 space-y-4">
								<div class="flex items-center justify-between gap-3">
									<div>
										<p class="text-sm text-muted-foreground">
											Crea tu propia empresa o solicita unirte a otra distinta.
										</p>
									</div>
									{#if pendingInvitations.length > 0}
										<Button
											variant="ghost"
											size="sm"
											onclick={() => {
												showOtherOptions = !showOtherOptions;
												userToggledOptions = true;
											}}
											class="text-muted-foreground hover:text-foreground"
										>
											{showOtherOptions ? 'Ocultar' : 'Ver opciones'}
										</Button>
									{/if}
								</div>

								{#if showOtherOptions || pendingInvitations.length === 0}
									<div class="space-y-4" in:fade={{ duration: 150 }}>
										<RadioGroup.Root bind:value={selectedPath} class="grid gap-3">
											<div>
												<RadioGroup.Item value="join" id="join" class="peer sr-only" />
												<Label
													for="join"
													class="flex items-center gap-3 rounded-lg border border-border bg-background p-3.5 hover:bg-accent/50 cursor-pointer transition-all
														peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
												>
													<div
														class="flex items-center justify-center w-9 h-9 rounded-lg bg-muted text-muted-foreground shrink-0"
													>
														<span class="material-symbols-rounded text-xl!">group_add</span>
													</div>
													<div class="flex flex-col">
														<span class="font-medium text-sm">Unirse a una empresa</span>
														<span class="text-xs text-muted-foreground">
															Busca por nombre o código de invitación
														</span>
													</div>
												</Label>
											</div>
											<div>
												<RadioGroup.Item value="create" id="create" class="peer sr-only" />
												<Label
													for="create"
													class="flex items-center gap-3 rounded-lg border border-border bg-background p-3.5 hover:bg-accent/50 cursor-pointer transition-all
														peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
												>
													<div
														class="flex items-center justify-center w-9 h-9 rounded-lg bg-muted text-muted-foreground shrink-0"
													>
														<span class="material-symbols-rounded text-xl!">add_business</span>
													</div>
													<div class="flex flex-col">
														<span class="font-medium text-sm">Crear una nueva empresa</span>
														<span class="text-xs text-muted-foreground">
															Configura tu empresa y gestiona tu equipo
														</span>
													</div>
												</Label>
											</div>
										</RadioGroup.Root>
									</div>
								{/if}
							</div>
						</CardContent>
						<CardFooter class="flex items-center justify-between gap-3">
							<Button
								variant="ghost"
								onclick={() => {
									stage = 0;
									carouselApi?.scrollTo(0);
								}}
							>
								<span class="material-symbols-rounded text-lg! mr-2">arrow_back</span>
								Volver
							</Button>
							<Button onclick={handleContinue} disabled={!selectedPath}>
								Continuar
								<span class="material-symbols-rounded text-lg! ml-2">arrow_forward</span>
							</Button>
						</CardFooter>
					</Card>
				</CarouselItem>

				<CarouselItem class="flex justify-center">
					<Card class="shadow-lg max-w-xl w-full">
						{#if selectedPath === 'create'}
							<CardHeader>
								<CardTitle class="text-xl flex items-center gap-2">
									<span class="material-symbols-rounded text-primary">add_business</span>
									Crear nueva empresa
								</CardTitle>
							</CardHeader>
							<CardContent class="space-y-5">
								<Field>
									<FieldLabel>
										<Label for="company-name">Nombre de la empresa *</Label>
									</FieldLabel>
									<Input
										id="company-name"
										type="text"
										placeholder="Mi Empresa S.L."
										bind:value={companyName}
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
								{#if createError}
									<FieldError class="text-sm">{createError}</FieldError>
								{/if}
							</CardContent>
							<CardFooter class="flex items-center justify-between gap-3">
								<Button
									variant="ghost"
									onclick={() => {
										stage = 1;
										carouselApi?.scrollTo(1);
									}}
								>
									<span class="material-symbols-rounded text-lg! mr-2">arrow_back</span>
									Volver
								</Button>
								<Button onclick={handleCreateSubmit} disabled={isSubmittingCreate}>
									{#if isSubmittingCreate}
										<span class="material-symbols-rounded animate-spin mr-2">progress_activity</span
										>
										Creando...
									{:else}
										Crear empresa
									{/if}
								</Button>
							</CardFooter>
						{:else if selectedPath === 'join'}
							<CardHeader>
								<CardTitle class="text-xl flex items-center gap-2">
									<span class="material-symbols-rounded text-primary">group_add</span>
									Unirse a una empresa
								</CardTitle>
							</CardHeader>
							<CardContent class="space-y-6">
								<div class="space-y-3">
									<Field>
										<FieldLabel>
											<Label for="search">Buscar empresa</Label>
										</FieldLabel>
										<Input
											id="search"
											type="text"
											placeholder="Nombre de la empresa"
											value={searchQuery}
											oninput={(e) => handleSearchInput(e.currentTarget.value)}
										/>
									</Field>
									{#if searchError}
										<FieldError class="text-sm">{searchError}</FieldError>
									{/if}
									{#if searchResults.length > 0}
										<div class="space-y-2">
											{#each searchResults as company}
												<Button
													variant={selectedCompany?.id === company.id ? 'default' : 'outline'}
													class={`w-full items-center justify-between`}
													type="button"
													onclick={() => handleSelectCompany(company)}
													aria-pressed={selectedCompany?.id === company.id}
												>
													<p class="font-medium text-left">{company.name}</p>
													{#if selectedCompany?.id === company.id}
														<span class="material-symbols-rounded ml-3">check_circle</span>
													{/if}
												</Button>
											{/each}
										</div>
									{:else if isSearching}
										<p class="text-sm text-muted-foreground">Buscando...</p>
									{/if}
								</div>

								<!-- <div class="space-y-3">
									<Field>
										<FieldLabel>
											<Label for="invite-code">Código de invitación</Label>
										</FieldLabel>
										<Input
											id="invite-code"
											type="text"
											placeholder="Código alfanumérico"
											bind:value={inviteCode}
										/>
									</Field>
									<div class="flex gap-3">
										<Button variant="secondary" onclick={handleCheckCode} disabled={isCheckingCode}>
											{#if isCheckingCode}
												<span class="material-symbols-rounded animate-spin mr-2">progress_activity</span>
												Verificando...
											{:else}
												Validar código
											{/if}
										</Button>
										{#if codeError}
											<FieldError class="text-sm">{codeError}</FieldError>
										{/if}
									</div>
									{#if codeCompany}
										<div class="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
											<p class="font-semibold text-primary">{codeCompany.name}</p>
											<p class="text-xs text-muted-foreground">
												{codeCompany.inviteCode ? `Código: ${codeCompany.inviteCode}` : 'Sin código'}
											</p>
										</div>
									{/if}
								</div> -->

								{#if joinError}
									<FieldError class="text-sm">{joinError}</FieldError>
								{/if}
							</CardContent>
							<CardFooter class="flex items-center justify-between gap-3">
								<Button
									variant="ghost"
									onclick={() => {
										stage = 1;
										carouselApi?.scrollTo(1);
									}}
								>
									<span class="material-symbols-rounded text-lg! mr-2">arrow_back</span>
									Volver
								</Button>
								<Button onclick={handleJoinSubmit} disabled={!selectedCompany || isSubmittingJoin}>
									{#if isSubmittingJoin}
										<span class="material-symbols-rounded animate-spin mr-2">progress_activity</span
										>
										Enviando...
									{:else}
										Solicitar acceso
									{/if}
								</Button>
							</CardFooter>
						{/if}
					</Card>
				</CarouselItem>
			</CarouselContent>
		</Carousel>
	</div>
</div>

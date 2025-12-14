<script lang="ts">
	import { auth, type Profile } from '$lib/stores/auth';
	import { setActiveProfileId, loadAndSetProfiles } from '$lib/auth';
	import {
		fetchAuthPendingInvitations,
		acceptInvitationAsUser,
		searchCompanies,
		requestJoin,
		createCompany,
		type AuthPendingInvitation,
		type CompanySearchResult
	} from '$lib/api/onboarding';
	import { fetchMunicipalities } from '$lib/api/company-location';
	import {
		SPAIN_REGIONS,
		getProvincesByRegion,
		getRegionName,
		getProvinceName,
		deriveLocationFromPostalCode,
		isValidPostalCodeFormat,
		isPostalCodeConsistentWithProvince
	} from '$lib/data/spain-locations';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Field, FieldLabel, FieldError, FieldDescription } from '$lib/components/ui/field';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import RelationTypeBadge from './RelationTypeBadge.svelte';

	type Props = {
		open: boolean;
		onSuccess?: (profile: Profile) => void;
		onClose?: () => void;
	};

	let { open = $bindable(), onSuccess, onClose }: Props = $props();

	// Tab state
	let activeTab = $state<'invitations' | 'search' | 'create'>('invitations');
	let hasInitialized = $state(false);
	let hasAutoSwitched = $state(false);

	// Invitations state
	let invitations = $state<AuthPendingInvitation[]>([]);
	let loadingInvitations = $state(false);
	let acceptingId = $state<string | null>(null);
	let invitationsError = $state<string | null>(null);

	// Search company state
	let searchQuery = $state('');
	let searchResults = $state<CompanySearchResult[]>([]);
	let isSearching = $state(false);
	let searchError = $state<string | null>(null);
	let selectedCompany = $state<CompanySearchResult | null>(null);
	let isSubmittingJoin = $state(false);
	let joinError = $state<string | null>(null);
	let joinSuccess = $state<string | null>(null);
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	// Create company state
	let companyName = $state('');
	let cif = $state('');
	let userName = $state('');
	let selectedRegionCode = $state<string | undefined>(undefined);
	let selectedProvinceCode = $state<string | undefined>(undefined);
	let selectedMunicipalityName = $state<string | undefined>(undefined);
	let address = $state('');
	let postalCode = $state('');
	let municipalities = $state<string[]>([]);
	let loadingMunicipalities = $state(false);
	let isSubmittingCreate = $state(false);
	let createError = $state<string | null>(null);

	const roleLabels: Record<string, string> = {
		OWNER: 'Propietario',
		ADMIN: 'Administrador',
		WORKER: 'Trabajador',
		AUDITOR: 'Auditor'
	};

	// Derived values for create company
	const availableProvinces = $derived(
		selectedRegionCode ? getProvincesByRegion(selectedRegionCode) : []
	);

	const selectedRegionName = $derived(
		selectedRegionCode ? getRegionName(selectedRegionCode) : undefined
	);

	const selectedProvinceName = $derived(
		selectedProvinceCode ? getProvinceName(selectedProvinceCode) : undefined
	);

	const postalCodeError = $derived.by(() => {
		if (!postalCode) return null;
		if (!isValidPostalCodeFormat(postalCode)) {
			return 'El código postal debe tener 5 dígitos';
		}
		if (
			selectedProvinceCode &&
			!isPostalCodeConsistentWithProvince(postalCode, selectedProvinceCode)
		) {
			return 'El código postal no corresponde a la provincia seleccionada';
		}
		return null;
	});

	const isCreateFormValid = $derived(
		companyName.trim() &&
			userName.trim() &&
			selectedRegionCode &&
			selectedProvinceCode &&
			selectedMunicipalityName &&
			address.trim() &&
			postalCode.trim() &&
			!postalCodeError
	);

	// Load invitations when modal opens
	async function loadInvitations() {
		loadingInvitations = true;
		invitationsError = null;
		try {
			invitations = await fetchAuthPendingInvitations();
		} catch (e) {
			invitationsError = e instanceof Error ? e.message : 'Error al cargar invitaciones';
		} finally {
			loadingInvitations = false;
		}
	}

	// Accept invitation
	async function handleAcceptInvitation(invitation: AuthPendingInvitation) {
		if (acceptingId) return;

		acceptingId = invitation.id;
		invitationsError = null;

		try {
			const result = await acceptInvitationAsUser(invitation.token);

			// Refresh profiles
			await loadAndSetProfiles();

			// Switch to the new profile
			setActiveProfileId(result.profile.id);
			auth.setActiveProfile(result.profile as Profile);

			open = false;
			onSuccess?.(result.profile as Profile);

			// Reload to apply new profile
			window.location.reload();
		} catch (e) {
			invitationsError = e instanceof Error ? e.message : 'Error al aceptar invitación';
		} finally {
			acceptingId = null;
		}
	}

	// Search companies
	function handleSearchInput(value: string) {
		searchQuery = value;
		searchError = null;
		selectedCompany = null;
		joinError = null;
		joinSuccess = null;

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
	}

	function handleSelectCompany(company: CompanySearchResult) {
		selectedCompany = company;
		joinError = null;
		joinSuccess = null;
	}

	// Request to join selected company
	async function handleSubmitJoin() {
		if (isSubmittingJoin || !selectedCompany) return;

		isSubmittingJoin = true;
		joinError = null;
		joinSuccess = null;

		try {
			// Get userName from auth store
			const state = auth;
			let name = '';
			const unsubscribe = state.subscribe((s) => {
				name = s.user?.name ?? '';
			});
			unsubscribe();

			if (!name.trim()) {
				joinError = 'No se pudo obtener tu nombre. Intenta de nuevo.';
				return;
			}

			await requestJoin({
				companyId: selectedCompany.id,
				name: name.trim()
			});
			joinSuccess = `Solicitud enviada a ${selectedCompany.name}. Un administrador debe aprobarla.`;
			searchQuery = '';
			searchResults = [];
			selectedCompany = null;
		} catch (e) {
			joinError = e instanceof Error ? e.message : 'Error al enviar solicitud';
		} finally {
			isSubmittingJoin = false;
		}
	}

	// Load municipalities when province changes
	async function loadMunicipalities(provinceCode: string) {
		loadingMunicipalities = true;
		try {
			municipalities = await fetchMunicipalities(provinceCode);
		} catch (e) {
			console.error('Error loading municipalities:', e);
			municipalities = [];
		} finally {
			loadingMunicipalities = false;
		}
	}

	function handleRegionChange(regionCode: string | undefined) {
		selectedRegionCode = regionCode;
		selectedProvinceCode = undefined;
		selectedMunicipalityName = undefined;
		municipalities = [];
	}

	function handleProvinceChange(provinceCode: string | undefined) {
		selectedProvinceCode = provinceCode;
		selectedMunicipalityName = undefined;
		if (provinceCode) {
			loadMunicipalities(provinceCode);
		} else {
			municipalities = [];
		}
	}

	function handlePostalCodeInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const value = input.value;
		postalCode = value;

		if (isValidPostalCodeFormat(value)) {
			const derived = deriveLocationFromPostalCode(value);
			if (derived) {
				if (!selectedRegionCode || selectedRegionCode !== derived.regionCode) {
					selectedRegionCode = derived.regionCode;
				}
				if (!selectedProvinceCode || selectedProvinceCode !== derived.provinceCode) {
					selectedProvinceCode = derived.provinceCode;
					selectedMunicipalityName = undefined;
					loadMunicipalities(derived.provinceCode);
				}
			}
		}
	}

	async function handleSubmitCreate() {
		if (isSubmittingCreate) return;

		createError = null;

		if (!companyName.trim()) {
			createError = 'El nombre de la empresa es obligatorio';
			return;
		}

		if (!userName.trim()) {
			createError = 'Tu nombre es obligatorio';
			return;
		}

		if (!selectedRegionCode || !selectedProvinceCode || !selectedMunicipalityName) {
			createError = 'La ubicación es obligatoria';
			return;
		}

		if (!address.trim() || !postalCode.trim()) {
			createError = 'La dirección y código postal son obligatorios';
			return;
		}

		if (postalCodeError) {
			createError = postalCodeError;
			return;
		}

		isSubmittingCreate = true;

		try {
			const result = await createCompany({
				companyName: companyName.trim(),
				cif: cif.trim() || undefined,
				userName: userName.trim(),
				regionCode: selectedRegionCode,
				provinceCode: selectedProvinceCode,
				municipalityName: selectedMunicipalityName,
				address: address.trim(),
				postalCode: postalCode.trim()
			});

			if (result.status === 'ACTIVE' && result.user) {
				// Refresh profiles
				await loadAndSetProfiles();

				// Switch to the new profile
				setActiveProfileId(result.user.id);

				open = false;

				// Reload to apply new profile
				window.location.reload();
			} else {
				createError = 'Error inesperado al crear la empresa';
			}
		} catch (e) {
			createError = e instanceof Error ? e.message : 'Error al crear la empresa';
		} finally {
			isSubmittingCreate = false;
		}
	}

	function resetForm() {
		// Reset all state
		invitations = [];
		loadingInvitations = false;
		acceptingId = null;
		invitationsError = null;

		searchQuery = '';
		searchResults = [];
		isSearching = false;
		searchError = null;
		selectedCompany = null;
		isSubmittingJoin = false;
		joinError = null;
		joinSuccess = null;
		if (searchTimeout) {
			clearTimeout(searchTimeout);
			searchTimeout = null;
		}

		companyName = '';
		cif = '';
		userName = '';
		selectedRegionCode = undefined;
		selectedProvinceCode = undefined;
		selectedMunicipalityName = undefined;
		address = '';
		postalCode = '';
		municipalities = [];
		isSubmittingCreate = false;
		createError = null;

		activeTab = 'invitations';
		hasAutoSwitched = false;
	}

	$effect(() => {
		if (open && !hasInitialized) {
			hasInitialized = true;
			resetForm();
			loadInvitations();

			// Pre-fill userName from auth store
			const state = auth;
			const unsubscribe = state.subscribe((s) => {
				if (s.user?.name && !userName) {
					userName = s.user.name;
				}
			});
			unsubscribe();
		} else if (!open && hasInitialized) {
			// Reset initialization flag when modal closes
			hasInitialized = false;
			hasAutoSwitched = false;
		}
	});

	// Switch to appropriate tab based on invitations (only once on initial load)
	$effect(() => {
		if (!loadingInvitations && invitations.length === 0 && activeTab === 'invitations' && !hasAutoSwitched) {
			activeTab = 'search';
			hasAutoSwitched = true;
		}
	});
</script>

<Dialog.Root
	bind:open
	onOpenChange={(isOpen) => {
		if (!isOpen) {
			resetForm();
			onClose?.();
		}
	}}
>
	<Dialog.Content class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<span class="material-symbols-rounded text-primary">add_business</span>
				Unirse a otra empresa
			</Dialog.Title>
			<Dialog.Description>
				Acepta una invitación, busca una empresa para unirte o crea una nueva
			</Dialog.Description>
		</Dialog.Header>

		<Tabs bind:value={activeTab} class="w-full">
			<TabsList>
				<TabsTrigger value="invitations" class="gap-1.5">
					<span class="material-symbols-rounded text-lg!">mail</span>
					<span class="hidden sm:inline">Invitaciones</span>
					{#if invitations.length > 0}
						<Badge variant="secondary" class="ml-1">{invitations.length}</Badge>
					{/if}
				</TabsTrigger>
				<TabsTrigger value="search" class="gap-1.5">
					<span class="material-symbols-rounded text-lg!">search</span>
					<span class="hidden sm:inline">Buscar</span>
				</TabsTrigger>
				<TabsTrigger value="create" class="gap-1.5">
					<span class="material-symbols-rounded text-lg!">add</span>
					<span class="hidden sm:inline">Crear</span>
				</TabsTrigger>
			</TabsList>

			<!-- Pending Invitations Tab -->
			<TabsContent value="invitations" class="mt-4">
				{#if loadingInvitations}
					<div class="space-y-3">
						{#each [1, 2] as i (i)}
							<Skeleton class="h-20 w-full" />
						{/each}
					</div>
				{:else if invitationsError}
					<div class="text-center py-6 text-destructive">
						<span class="material-symbols-rounded text-3xl! mb-2">error</span>
						<p>{invitationsError}</p>
						<Button variant="outline" size="sm" class="mt-3" onclick={loadInvitations}>
							Reintentar
						</Button>
					</div>
				{:else if invitations.length === 0}
					<div class="text-center py-8 text-muted-foreground">
						<span class="material-symbols-rounded text-4xl! mb-2">inbox</span>
						<p>No tienes invitaciones pendientes</p>
						<p class="text-sm mt-1">
							Pide a un administrador que te invite o busca una empresa
						</p>
					</div>
				{:else}
					<div class="space-y-3">
						{#each invitations as invitation (invitation.id)}
							<div
								class="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
							>
								<div
									class="flex items-center justify-center w-12 h-12 rounded-lg bg-muted text-lg font-semibold shrink-0"
								>
									{#if invitation.company.logoUrl}
										<img
											src={invitation.company.logoUrl}
											alt={invitation.company.name}
											class="w-full h-full object-cover rounded-lg"
										/>
									{:else}
										{invitation.company.name.charAt(0).toUpperCase()}
									{/if}
								</div>
								<div class="flex-1 min-w-0">
									<div class="font-medium truncate">{invitation.company.name}</div>
									<div class="flex items-center gap-2 mt-1 flex-wrap">
										<span class="text-sm text-muted-foreground">
											{roleLabels[invitation.role] ?? invitation.role}
										</span>
										<RelationTypeBadge type={invitation.relationType} class="text-xs" />
									</div>
								</div>
								<Button
									size="sm"
									onclick={() => handleAcceptInvitation(invitation)}
									disabled={acceptingId !== null}
								>
									{#if acceptingId === invitation.id}
										<span class="material-symbols-rounded animate-spin text-lg!">progress_activity</span>
									{:else}
										Aceptar
									{/if}
								</Button>
							</div>
						{/each}
					</div>
				{/if}
			</TabsContent>

			<!-- Search Company Tab -->
			<TabsContent value="search" class="mt-4">
				<div class="space-y-4">
					<p class="text-sm text-muted-foreground">
						Busca tu empresa por nombre y solicita acceso.
						Un administrador deberá aprobar tu solicitud.
					</p>

					<Field>
						<FieldLabel>
							<Label for="search-company">Buscar empresa</Label>
						</FieldLabel>
						<Input
							id="search-company"
							type="text"
							placeholder="Nombre de la empresa"
							value={searchQuery}
							oninput={(e) => handleSearchInput(e.currentTarget.value)}
							disabled={isSubmittingJoin}
						/>
						{#if searchError}
							<FieldError class="text-sm text-destructive">{searchError}</FieldError>
						{/if}
					</Field>

					{#if isSearching}
						<p class="text-sm text-muted-foreground flex items-center gap-2">
							<span class="material-symbols-rounded animate-spin text-lg!">progress_activity</span>
							Buscando...
						</p>
					{:else if searchResults.length > 0}
						<div class="space-y-2 max-h-48 overflow-y-auto">
							{#each searchResults as company (company.id)}
								<button
									type="button"
									class="w-full flex items-center gap-3 p-3 border rounded-lg text-left transition-colors hover:bg-muted/50 {selectedCompany?.id === company.id ? 'border-primary bg-primary/5' : ''}"
									onclick={() => handleSelectCompany(company)}
								>
									<div
										class="flex items-center justify-center w-10 h-10 rounded-lg bg-muted text-sm font-semibold shrink-0"
									>
										{company.name.charAt(0).toUpperCase()}
									</div>
									<div class="flex-1 min-w-0">
										<p class="font-medium truncate">{company.name}</p>
									</div>
									{#if selectedCompany?.id === company.id}
										<span class="material-symbols-rounded text-primary">check_circle</span>
									{/if}
								</button>
							{/each}
						</div>
					{:else if searchQuery.trim().length >= 2}
						<p class="text-sm text-muted-foreground">No se encontraron empresas</p>
					{/if}

					{#if joinError}
						<FieldError class="text-sm text-destructive">{joinError}</FieldError>
					{/if}
					{#if joinSuccess}
						<div class="text-sm text-success flex items-center gap-1.5 mt-2">
							<span class="material-symbols-rounded text-lg!">check_circle</span>
							{joinSuccess}
						</div>
					{/if}

					{#if selectedCompany}
						<div class="flex justify-end pt-2">
							<Button
								onclick={handleSubmitJoin}
								disabled={isSubmittingJoin}
							>
								{#if isSubmittingJoin}
									<span class="material-symbols-rounded animate-spin text-lg! mr-2">progress_activity</span>
									Enviando...
								{:else}
									Solicitar acceso
								{/if}
							</Button>
						</div>
					{/if}
				</div>
			</TabsContent>

			<!-- Create Company Tab -->
			<TabsContent value="create" class="mt-4">
				<form
					class="space-y-4"
					onsubmit={(e) => {
						e.preventDefault();
						handleSubmitCreate();
					}}
				>
					<Field>
						<FieldLabel>
							<Label for="new-company-name">Nombre de la empresa *</Label>
						</FieldLabel>
						<Input
							id="new-company-name"
							type="text"
							placeholder="Mi Empresa S.L."
							bind:value={companyName}
							disabled={isSubmittingCreate}
						/>
					</Field>

					<Field>
						<FieldLabel>
							<Label for="new-cif">CIF / NIF (opcional)</Label>
						</FieldLabel>
						<Input
							id="new-cif"
							type="text"
							placeholder="B12345678"
							bind:value={cif}
							disabled={isSubmittingCreate}
						/>
					</Field>

					<Field>
						<FieldLabel>
							<Label for="new-user-name">Tu nombre en esta empresa *</Label>
						</FieldLabel>
						<Input
							id="new-user-name"
							type="text"
							placeholder="Juan García"
							bind:value={userName}
							disabled={isSubmittingCreate}
						/>
					</Field>

					<div class="border-t pt-4 mt-4">
						<div class="flex items-center gap-2 mb-4">
							<span class="material-symbols-rounded text-primary">location_on</span>
							<h3 class="font-medium text-sm">Ubicación de la empresa</h3>
						</div>

						<div class="space-y-4">
							<Field>
								<FieldLabel>
									<Label for="new-postal-code">Código Postal *</Label>
								</FieldLabel>
								<Input
									id="new-postal-code"
									type="text"
									placeholder="08008"
									value={postalCode}
									oninput={handlePostalCodeInput}
									disabled={isSubmittingCreate}
									class="max-w-[150px]"
									maxlength={5}
								/>
								{#if postalCodeError}
									<FieldError class="text-xs text-destructive">{postalCodeError}</FieldError>
								{:else}
									<FieldDescription class="text-xs text-muted-foreground">
										Se autocompletará la provincia y comunidad
									</FieldDescription>
								{/if}
							</Field>

							<Field>
								<FieldLabel>
									<Label for="new-region">Comunidad Autónoma *</Label>
								</FieldLabel>
								<Select
									type="single"
									value={selectedRegionCode}
									onValueChange={handleRegionChange}
									disabled={isSubmittingCreate}
								>
									<SelectTrigger class="w-full">
										{#if selectedRegionName}
											{selectedRegionName}
										{:else}
											<span class="text-muted-foreground">Seleccionar comunidad</span>
										{/if}
									</SelectTrigger>
									<SelectContent>
										{#each SPAIN_REGIONS as region (region.code)}
											<SelectItem value={region.code} label={region.name} />
										{/each}
									</SelectContent>
								</Select>
							</Field>

							<div class="grid grid-cols-2 gap-4">
								<Field>
									<FieldLabel>
										<Label for="new-province">Provincia *</Label>
									</FieldLabel>
									<Select
										type="single"
										value={selectedProvinceCode}
										onValueChange={handleProvinceChange}
										disabled={isSubmittingCreate || !selectedRegionCode}
									>
										<SelectTrigger class="w-full">
											{#if selectedProvinceName}
												{selectedProvinceName}
											{:else}
												<span class="text-muted-foreground">
													{selectedRegionCode ? 'Seleccionar' : 'Comunidad primero'}
												</span>
											{/if}
										</SelectTrigger>
										<SelectContent>
											{#each availableProvinces as province (province.code)}
												<SelectItem value={province.code} label={province.name} />
											{/each}
										</SelectContent>
									</Select>
								</Field>

								<Field>
									<FieldLabel>
										<Label for="new-municipality">Municipio *</Label>
									</FieldLabel>
									<Select
										type="single"
										value={selectedMunicipalityName}
										onValueChange={(value) => (selectedMunicipalityName = value)}
										disabled={isSubmittingCreate || !selectedProvinceCode || loadingMunicipalities}
									>
										<SelectTrigger class="w-full">
											{#if loadingMunicipalities}
												<span class="text-muted-foreground flex items-center gap-2">
													<span class="material-symbols-rounded animate-spin text-sm!">progress_activity</span>
													Cargando...
												</span>
											{:else if selectedMunicipalityName}
												{selectedMunicipalityName}
											{:else}
												<span class="text-muted-foreground">
													{selectedProvinceCode ? 'Seleccionar' : 'Provincia primero'}
												</span>
											{/if}
										</SelectTrigger>
										<SelectContent>
											{#each municipalities as municipality (municipality)}
												<SelectItem value={municipality} label={municipality} />
											{/each}
										</SelectContent>
									</Select>
								</Field>
							</div>

							<Field>
								<FieldLabel>
									<Label for="new-address">Dirección *</Label>
								</FieldLabel>
								<Input
									id="new-address"
									type="text"
									placeholder="Carrer de Balmes 123"
									bind:value={address}
									disabled={isSubmittingCreate}
								/>
							</Field>
						</div>
					</div>

					{#if createError}
						<FieldError class="text-sm text-destructive">{createError}</FieldError>
					{/if}

					<div class="flex justify-end pt-4">
						<Button type="submit" disabled={isSubmittingCreate || !isCreateFormValid}>
							{#if isSubmittingCreate}
								<span class="material-symbols-rounded animate-spin text-lg! mr-2">progress_activity</span>
								Creando...
							{:else}
								Crear empresa
							{/if}
						</Button>
					</div>
				</form>
			</TabsContent>
		</Tabs>
	</Dialog.Content>
</Dialog.Root>

<script lang="ts">
	import { createCompany } from '$lib/api/onboarding';
	import { fetchMunicipalities } from '$lib/api/company-location';
	import {
		SPAIN_REGIONS,
		getProvincesByRegion,
		getRegionName,
		getProvinceName,
		deriveLocationFromPostalCode,
		isValidPostalCodeFormat,
		isPostalCodeConsistentWithProvince,
	} from '$lib/data/spain-locations';
	import { auth } from '$lib/stores/auth';
	import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Field, FieldLabel, FieldError, FieldDescription } from '$lib/components/ui/field';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';

	interface Props {
		userName: string;
		isActive?: boolean;
		onBack: () => void;
		onSuccess: () => void;
	}

	let { userName, isActive = false, onBack, onSuccess }: Props = $props();

	let companyName = $state('');
	let cif = $state('');

	// Location fields - codes only for region/province
	let selectedRegionCode = $state<string | undefined>(undefined);
	let selectedProvinceCode = $state<string | undefined>(undefined);
	let selectedMunicipalityName = $state<string | undefined>(undefined);
	let address = $state('');
	let postalCode = $state('');

	// Municipalities loaded from API (plain names)
	let municipalities = $state<string[]>([]);
	let loadingMunicipalities = $state(false);

	let isSubmitting = $state(false);
	let errorMessage = $state<string | null>(null);

	// Derived values
	const availableProvinces = $derived(
		selectedRegionCode ? getProvincesByRegion(selectedRegionCode) : []
	);

	const selectedRegionName = $derived(
		selectedRegionCode ? getRegionName(selectedRegionCode) : undefined
	);

	const selectedProvinceName = $derived(
		selectedProvinceCode ? getProvinceName(selectedProvinceCode) : undefined
	);

	// Postal code validation
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

	// Form validity
	const isFormValid = $derived(
		companyName.trim() &&
			userName.trim() &&
			selectedRegionCode &&
			selectedProvinceCode &&
			selectedMunicipalityName &&
			address.trim() &&
			postalCode.trim() &&
			!postalCodeError
	);

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

	// Handle region change - reset province and municipality
	function handleRegionChange(regionCode: string | undefined) {
		selectedRegionCode = regionCode;
		selectedProvinceCode = undefined;
		selectedMunicipalityName = undefined;
		municipalities = [];
	}

	// Handle province change - reset municipality and load new list
	function handleProvinceChange(provinceCode: string | undefined) {
		selectedProvinceCode = provinceCode;
		selectedMunicipalityName = undefined;
		if (provinceCode) {
			loadMunicipalities(provinceCode);
		} else {
			municipalities = [];
		}
	}

	// Handle postal code input - autofill region/province if valid
	function handlePostalCodeInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const value = input.value;
		postalCode = value;

		if (isValidPostalCodeFormat(value)) {
			const derived = deriveLocationFromPostalCode(value);
			if (derived) {
				// Only autofill if not already set or if different
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

	const handleSubmit = async () => {
		if (isSubmitting) return;

		errorMessage = null;

		// Validation
		if (!companyName.trim()) {
			errorMessage = 'El nombre de la empresa es obligatorio';
			return;
		}

		if (!userName.trim()) {
			errorMessage = 'Tu nombre es obligatorio';
			return;
		}

		if (!selectedRegionCode) {
			errorMessage = 'La comunidad autónoma es obligatoria';
			return;
		}

		if (!selectedProvinceCode) {
			errorMessage = 'La provincia es obligatoria';
			return;
		}

		if (!selectedMunicipalityName) {
			errorMessage = 'El municipio es obligatorio';
			return;
		}

		if (!address.trim()) {
			errorMessage = 'La dirección es obligatoria';
			return;
		}

		if (!postalCode.trim()) {
			errorMessage = 'El código postal es obligatorio';
			return;
		}

		if (postalCodeError) {
			errorMessage = postalCodeError;
			return;
		}

		isSubmitting = true;

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
				auth.setUser(result.user);
				onSuccess?.();
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

<Card
	class={`shadow-lg w-full ${
		isActive
			? 'relative opacity-100 transition-opacity duration-150'
			: 'absolute inset-0 opacity-0 pointer-events-none transition-opacity duration-150'
	}`}
	aria-hidden={!isActive}
>
	<CardHeader>
		<CardTitle class="text-xl flex items-center gap-2">
			<span class="material-symbols-rounded text-primary">add_business</span>
			Crear nueva empresa
		</CardTitle>
		<p class="text-sm text-muted-foreground">Configura los datos básicos de tu empresa.</p>
	</CardHeader>

	<CardContent class="space-y-6">
		<form
			id="create-company-form"
			class="space-y-6"
			onsubmit={(event) => {
				event.preventDefault();
				handleSubmit();
			}}
		>
			<!-- Company Basic Info -->
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

			<!-- Location Section -->
			<div class="border-t pt-6 mt-6">
				<div class="flex items-center gap-2 mb-4">
					<span class="material-symbols-rounded text-primary">location_on</span>
					<h3 class="font-medium">Ubicación de la empresa</h3>
				</div>

				<div class="space-y-4">
					<!-- Postal Code first - enables autofill -->
					<Field>
						<FieldLabel>
							<Label for="postal-code">Código Postal *</Label>
						</FieldLabel>
						<Input
							id="postal-code"
							type="text"
							placeholder="08008"
							value={postalCode}
							oninput={handlePostalCodeInput}
							disabled={isSubmitting}
							class="max-w-[150px]"
							maxlength={5}
						/>
						{#if postalCodeError}
							<FieldError class="text-xs text-destructive">{postalCodeError}</FieldError>
						{:else}
							<FieldDescription
								class="text-xs text-muted-foreground flex items-start gap-1.5 mt-1.5"
							>
								<span class="material-symbols-rounded text-sm!">info</span>
								<span
									>Al introducir el código postal se autocompletará la provincia y comunidad.</span
								>
							</FieldDescription>
						{/if}
					</Field>

					<Field>
						<FieldLabel>
							<Label for="region">Comunidad Autónoma *</Label>
						</FieldLabel>
						<Select
							type="single"
							value={selectedRegionCode}
							onValueChange={handleRegionChange}
							disabled={isSubmitting}
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
						<FieldDescription class="text-xs text-muted-foreground flex items-start gap-1.5 mt-1.5">
							<span class="material-symbols-rounded text-sm!">info</span>
							<span
								>La comunidad autónoma determina los días festivos que se aplicarán automáticamente.</span
							>
						</FieldDescription>
					</Field>

					<div class="grid grid-cols-2 gap-4">
						<Field>
							<FieldLabel>
								<Label for="province">Provincia *</Label>
							</FieldLabel>
							<Select
								type="single"
								value={selectedProvinceCode}
								onValueChange={handleProvinceChange}
								disabled={isSubmitting || !selectedRegionCode}
							>
								<SelectTrigger class="w-full">
									{#if selectedProvinceName}
										{selectedProvinceName}
									{:else}
										<span class="text-muted-foreground">
											{selectedRegionCode
												? 'Seleccionar provincia'
												: 'Selecciona comunidad primero'}
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
								<Label for="municipality">Municipio *</Label>
							</FieldLabel>
							<Select
								type="single"
								value={selectedMunicipalityName}
								onValueChange={(value) => (selectedMunicipalityName = value)}
								disabled={isSubmitting || !selectedProvinceCode || loadingMunicipalities}
							>
								<SelectTrigger class="w-full">
									{#if loadingMunicipalities}
										<span class="text-muted-foreground flex items-center gap-2">
											<span class="material-symbols-rounded animate-spin text-sm!"
												>progress_activity</span
											>
											Cargando...
										</span>
									{:else if selectedMunicipalityName}
										{selectedMunicipalityName}
									{:else}
										<span class="text-muted-foreground">
											{selectedProvinceCode
												? 'Seleccionar municipio'
												: 'Selecciona provincia primero'}
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
							<Label for="address">Dirección *</Label>
						</FieldLabel>
						<Input
							id="address"
							type="text"
							placeholder="Carrer de Balmes 123"
							bind:value={address}
							disabled={isSubmitting}
						/>
					</Field>
				</div>
			</div>

			{#if errorMessage}
				<FieldError class="text-sm text-destructive">{errorMessage}</FieldError>
			{/if}
		</form>
	</CardContent>

	<CardFooter class="flex items-center justify-between gap-3">
		<Button variant="ghost" onclick={onBack} type="button">
			<span class="material-symbols-rounded text-lg! mr-2">arrow_back</span>
			Volver
		</Button>

		<Button form="create-company-form" type="submit" disabled={isSubmitting || !isFormValid}>
			{#if isSubmitting}
				<span class="material-symbols-rounded animate-spin text-lg! mr-2">progress_activity</span>
				Creando empresa...
			{:else}
				Crear empresa
			{/if}
		</Button>
	</CardFooter>
</Card>

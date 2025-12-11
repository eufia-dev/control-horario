<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import {
		fetchCompanyLocation,
		updateCompanyLocation,
		fetchMunicipalities,
		type LocationResponse
	} from '$lib/api/company-location';
	import {
		SPAIN_REGIONS,
		getProvincesByRegion,
		getRegionName,
		getProvinceName,
		deriveLocationFromPostalCode,
		isValidPostalCodeFormat,
		isPostalCodeConsistentWithProvince
	} from '$lib/data/spain-locations';

	let location = $state<LocationResponse | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let isEditing = $state(false);
	let submitting = $state(false);
	let editError = $state<string | null>(null);

	// Edit form state - codes only for region/province
	let editRegionCode = $state<string | undefined>(undefined);
	let editProvinceCode = $state<string | undefined>(undefined);
	let editMunicipalityName = $state<string | undefined>(undefined);
	let editAddress = $state('');
	let editPostalCode = $state('');

	// Municipalities loaded from API
	let municipalities = $state<string[]>([]);
	let loadingMunicipalities = $state(false);

	// Derived values
	const availableProvinces = $derived(
		editRegionCode ? getProvincesByRegion(editRegionCode) : []
	);

	const editRegionName = $derived(editRegionCode ? getRegionName(editRegionCode) : undefined);
	const editProvinceName = $derived(editProvinceCode ? getProvinceName(editProvinceCode) : undefined);

	// Postal code validation
	const postalCodeError = $derived.by(() => {
		if (!editPostalCode) return null;
		if (!isValidPostalCodeFormat(editPostalCode)) {
			return 'El código postal debe tener 5 dígitos';
		}
		if (editProvinceCode && !isPostalCodeConsistentWithProvince(editPostalCode, editProvinceCode)) {
			return 'El código postal no corresponde a la provincia seleccionada';
		}
		return null;
	});

	// Form validity
	const isFormValid = $derived(
		editRegionCode &&
		editProvinceCode &&
		editMunicipalityName &&
		editAddress.trim() &&
		editPostalCode.trim() &&
		!postalCodeError
	);

	async function loadLocation() {
		loading = true;
		error = null;
		try {
			location = await fetchCompanyLocation();
		} catch (e) {
			// Location might not exist yet, which is fine
			if (e instanceof Error && e.message.includes('no encontrada')) {
				location = null;
			} else {
				error = e instanceof Error ? e.message : 'Error al cargar la ubicación';
			}
		} finally {
			loading = false;
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

	// Handle region change - reset province and municipality
	function handleRegionChange(regionCode: string | undefined) {
		editRegionCode = regionCode;
		editProvinceCode = undefined;
		editMunicipalityName = undefined;
		municipalities = [];
	}

	// Handle province change - reset municipality and load new list
	function handleProvinceChange(provinceCode: string | undefined) {
		editProvinceCode = provinceCode;
		editMunicipalityName = undefined;
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
		editPostalCode = value;

		if (isValidPostalCodeFormat(value)) {
			const derived = deriveLocationFromPostalCode(value);
			if (derived) {
				// Only autofill if not already set or if different
				if (!editRegionCode || editRegionCode !== derived.regionCode) {
					editRegionCode = derived.regionCode;
				}
				if (!editProvinceCode || editProvinceCode !== derived.provinceCode) {
					editProvinceCode = derived.provinceCode;
					editMunicipalityName = undefined;
					loadMunicipalities(derived.provinceCode);
				}
			}
		}
	}

	function startEditing() {
		if (location) {
			editRegionCode = location.regionCode;
			editProvinceCode = location.provinceCode || undefined;
			editMunicipalityName = location.municipalityName || undefined;
			editAddress = location.address || '';
			editPostalCode = location.postalCode || '';
			// Load municipalities for current province
			if (location.provinceCode) {
				loadMunicipalities(location.provinceCode);
			}
		} else {
			editRegionCode = undefined;
			editProvinceCode = undefined;
			editMunicipalityName = undefined;
			editAddress = '';
			editPostalCode = '';
			municipalities = [];
		}
		editError = null;
		isEditing = true;
	}

	function cancelEditing() {
		isEditing = false;
		editError = null;
	}

	async function handleSave() {
		if (!editRegionCode) {
			editError = 'Selecciona una comunidad autónoma';
			return;
		}

		if (!editProvinceCode) {
			editError = 'Selecciona una provincia';
			return;
		}

		if (!editMunicipalityName) {
			editError = 'Selecciona un municipio';
			return;
		}

		if (!editAddress.trim()) {
			editError = 'La dirección es obligatoria';
			return;
		}

		if (!editPostalCode.trim()) {
			editError = 'El código postal es obligatorio';
			return;
		}

		if (postalCodeError) {
			editError = postalCodeError;
			return;
		}

		submitting = true;
		editError = null;

		try {
			location = await updateCompanyLocation({
				regionCode: editRegionCode,
				provinceCode: editProvinceCode,
				municipalityName: editMunicipalityName,
				address: editAddress.trim(),
				postalCode: editPostalCode.trim()
			});
			isEditing = false;
		} catch (e) {
			editError = e instanceof Error ? e.message : 'Error al guardar la ubicación';
		} finally {
			submitting = false;
		}
	}

	onMount(() => {
		loadLocation();
	});
</script>

<Card class="w-full max-w-5xl mx-auto">
	<CardHeader class="flex flex-row items-center justify-between space-y-0">
		<CardTitle class="text-2xl font-semibold tracking-tight flex items-center gap-2">
			<span class="material-symbols-rounded text-2xl!">location_on</span>
			Ubicación de la Empresa
		</CardTitle>
		{#if !isEditing && !loading}
			<Button variant="outline" onclick={startEditing}>
				<span class="material-symbols-rounded text-lg! mr-2">edit</span>
				Editar
			</Button>
		{/if}
	</CardHeader>
	<CardContent>
		{#if loading}
			<div class="space-y-4">
				<Skeleton class="h-6 w-48" />
				<Skeleton class="h-4 w-64" />
				<Skeleton class="h-4 w-56" />
			</div>
		{:else if error}
			<div class="flex items-center justify-center py-8 text-destructive">
				<span class="material-symbols-rounded mr-2">error</span>
				{error}
			</div>
		{:else if isEditing}
			<form
				class="space-y-4"
				onsubmit={(e) => {
					e.preventDefault();
					handleSave();
				}}
			>
				<!-- Postal Code first - enables autofill -->
				<div class="grid gap-2">
					<Label for="edit-postal">Código Postal *</Label>
					<Input
						id="edit-postal"
						value={editPostalCode}
						oninput={handlePostalCodeInput}
						placeholder="08008"
						disabled={submitting}
						class="max-w-[150px]"
						maxlength={5}
					/>
					{#if postalCodeError}
						<p class="text-xs text-destructive">{postalCodeError}</p>
					{:else}
						<p class="text-xs text-muted-foreground flex items-start gap-1.5">
							<span class="material-symbols-rounded text-sm!">info</span>
							<span>Al introducir el código postal se autocompletará la provincia y comunidad.</span>
						</p>
					{/if}
				</div>

				<div class="grid gap-2">
					<Label>Comunidad Autónoma *</Label>
					<Select
						type="single"
						value={editRegionCode}
						onValueChange={handleRegionChange}
						disabled={submitting}
					>
						<SelectTrigger class="w-full">
							{#if editRegionName}
								{editRegionName}
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
					<p class="text-xs text-muted-foreground flex items-start gap-1.5">
						<span class="material-symbols-rounded text-sm!">warning</span>
						<span>Cambiar la comunidad autónoma actualizará los días festivos automáticamente.</span
						>
					</p>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<Label for="edit-province">Provincia *</Label>
						<Select
							type="single"
							value={editProvinceCode}
							onValueChange={handleProvinceChange}
							disabled={submitting || !editRegionCode}
						>
							<SelectTrigger class="w-full">
								{#if editProvinceName}
									{editProvinceName}
								{:else}
									<span class="text-muted-foreground">
										{editRegionCode ? 'Seleccionar provincia' : 'Selecciona comunidad primero'}
									</span>
								{/if}
							</SelectTrigger>
							<SelectContent>
								{#each availableProvinces as province (province.code)}
									<SelectItem value={province.code} label={province.name} />
								{/each}
							</SelectContent>
						</Select>
					</div>
					<div class="grid gap-2">
						<Label for="edit-municipality">Municipio *</Label>
						<Select
							type="single"
							value={editMunicipalityName}
							onValueChange={(value) => (editMunicipalityName = value)}
							disabled={submitting || !editProvinceCode || loadingMunicipalities}
						>
							<SelectTrigger class="w-full">
								{#if loadingMunicipalities}
									<span class="text-muted-foreground flex items-center gap-2">
										<span class="material-symbols-rounded animate-spin text-sm!">progress_activity</span>
										Cargando...
									</span>
								{:else if editMunicipalityName}
									{editMunicipalityName}
								{:else}
									<span class="text-muted-foreground">
										{editProvinceCode ? 'Seleccionar municipio' : 'Selecciona provincia primero'}
									</span>
								{/if}
							</SelectTrigger>
							<SelectContent>
									{#each municipalities as municipality (municipality)}
										<SelectItem value={municipality} label={municipality} />
								{/each}
							</SelectContent>
						</Select>
					</div>
				</div>

				<div class="grid gap-2">
					<Label for="edit-address">Dirección *</Label>
					<Input
						id="edit-address"
						bind:value={editAddress}
						placeholder="Carrer de Balmes 123"
						disabled={submitting}
					/>
				</div>

				{#if editError}
					<div class="text-sm text-destructive">{editError}</div>
				{/if}

				<div class="flex gap-2 justify-end pt-4">
					<Button type="button" variant="outline" onclick={cancelEditing} disabled={submitting}>
						Cancelar
					</Button>
					<Button type="submit" disabled={submitting || !isFormValid}>
						{#if submitting}
							<span class="material-symbols-rounded animate-spin text-lg! mr-2"
								>progress_activity</span
							>
						{/if}
						Guardar cambios
					</Button>
				</div>
			</form>
		{:else if location}
			<div class="space-y-3">
				<div>
					<p class="text-sm text-muted-foreground">Comunidad Autónoma</p>
					<p class="font-medium">{getRegionName(location.regionCode)}</p>
				</div>
				{#if location.provinceCode}
					<div>
						<p class="text-sm text-muted-foreground">Provincia</p>
						<p>{getProvinceName(location.provinceCode)}</p>
					</div>
				{/if}
				{#if location.municipalityName}
					<div>
						<p class="text-sm text-muted-foreground">Municipio</p>
						<p>{location.municipalityName}</p>
					</div>
				{/if}
				{#if location.address}
					<div>
						<p class="text-sm text-muted-foreground">Dirección</p>
						<p>{location.address}{location.postalCode ? `, ${location.postalCode}` : ''}</p>
					</div>
				{/if}
			</div>
		{:else}
			<div class="flex flex-col items-center justify-center py-8 text-muted-foreground">
				<span class="material-symbols-rounded text-4xl! mb-2">location_off</span>
				<p>No hay ubicación configurada</p>
				<Button variant="outline" class="mt-4" onclick={startEditing}>
					<span class="material-symbols-rounded text-lg! mr-2">add</span>
					Configurar ubicación
				</Button>
			</div>
		{/if}
	</CardContent>
</Card>

<script lang="ts">
	import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Field, FieldLabel, FieldError } from '$lib/components/ui/field';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import type { CompanySearchResult } from '$lib/api/onboarding';

	export let isActive = false;
	export let searchQuery: string;
	export let searchResults: CompanySearchResult[] = [];
	export let isSearching = false;
	export let searchError: string | null = null;
	export let joinError: string | null = null;
	export let selectedCompany: CompanySearchResult | null = null;
	export let isSubmittingJoin = false;
	export let onBack: () => void;
	export let onSearchInput: (value: string) => void;
	export let onSelectCompany: (company: CompanySearchResult) => void;
	export let onSubmitJoin: () => void;
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
			<span class="material-symbols-rounded text-primary">group_add</span>
			Unirse a una empresa
		</CardTitle>
		<p class="text-sm text-muted-foreground">Busca tu empresa y solicita acceso.</p>
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
					oninput={(e) => onSearchInput(e.currentTarget.value)}
				/>
			</Field>
			{#if searchError}
				<FieldError class="text-sm">{searchError}</FieldError>
			{/if}
			{#if searchResults.length > 0}
				<div class="space-y-2">
					{#each searchResults as company (company.id)}
						<Button
							variant={selectedCompany?.id === company.id ? 'default' : 'outline'}
							class="w-full items-center justify-between"
							type="button"
							onclick={() => onSelectCompany(company)}
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

		{#if joinError}
			<FieldError class="text-sm">{joinError}</FieldError>
		{/if}
	</CardContent>

	<CardFooter class="flex items-center justify-between gap-3">
		<Button variant="ghost" onclick={onBack}>
			<span class="material-symbols-rounded text-lg! mr-2">arrow_back</span>
			Volver
		</Button>

		<Button onclick={onSubmitJoin} disabled={!selectedCompany || isSubmittingJoin}>
			{#if isSubmittingJoin}
				<span class="material-symbols-rounded animate-spin mr-2">progress_activity</span>
				Enviando...
			{:else}
				Solicitar acceso
			{/if}
		</Button>
	</CardFooter>
</Card>

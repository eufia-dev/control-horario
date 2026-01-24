<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';
	import ProviderFormModal from './ProviderFormModal.svelte';
	import ProviderDeleteDialog from './ProviderDeleteDialog.svelte';
	import { fetchProviders, type Provider } from '$lib/api/providers';
	import { formatDate } from '../helpers';

	let providers = $state<Provider[]>([]);
	let loadingProviders = $state(true);
	let providersError = $state<string | null>(null);
	let searchQuery = $state('');

	const filteredProviders = $derived(
		providers.filter((provider) => {
			if (!searchQuery.trim()) return true;
			const query = searchQuery.toLowerCase();
			return provider.name.toLowerCase().includes(query);
		})
	);

	let providerFormModalOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let selectedProvider = $state<Provider | null>(null);

	async function loadProviders() {
		loadingProviders = true;
		providersError = null;
		try {
			providers = await fetchProviders();
		} catch (e) {
			providersError = e instanceof Error ? e.message : 'Error desconocido';
		} finally {
			loadingProviders = false;
		}
	}

	onMount(() => {
		loadProviders();
	});

	function handleCreateProvider() {
		selectedProvider = null;
		providerFormModalOpen = true;
	}

	function handleEditProvider(provider: Provider) {
		selectedProvider = provider;
		providerFormModalOpen = true;
	}

	function handleDeleteProvider(provider: Provider) {
		selectedProvider = provider;
		deleteDialogOpen = true;
	}

	function handleModalClose() {
		selectedProvider = null;
	}

	function handleSuccess() {
		loadProviders();
	}
</script>

<Card class="w-full max-w-6xl mx-auto">
	<CardHeader class="flex flex-row items-center justify-between space-y-0">
		<CardTitle class="text-2xl font-semibold tracking-tight">Proveedores</CardTitle>
		<div class="flex items-center gap-4">
			<div class="relative">
				<span
					class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg!"
					>search</span
				>
				<Input
					type="text"
					placeholder="Buscar por nombre..."
					bind:value={searchQuery}
					class="pl-9 mr-9"
				/>
			</div>
			<Button onclick={handleCreateProvider}>
				<span class="material-symbols-rounded text-lg!">add</span>
				Añadir
			</Button>
		</div>
	</CardHeader>
	<CardContent>
		{#if loadingProviders}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Nombre</TableHead>
						<TableHead>Periodo de Pago</TableHead>
						<TableHead>Creado</TableHead>
						<TableHead class="w-[100px]">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each Array.from({ length: 3 }, (_, i) => i) as i (i)}
						<TableRow data-placeholder-index={i}>
							<TableCell><Skeleton class="h-4 w-32" /></TableCell>
							<TableCell><Skeleton class="h-4 w-20" /></TableCell>
							<TableCell><Skeleton class="h-4 w-20" /></TableCell>
							<TableCell><Skeleton class="h-8 w-20" /></TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		{:else if providersError}
			<div class="flex items-center justify-center py-8 text-destructive">
				<span class="material-symbols-rounded mr-2">error</span>
				{providersError}
			</div>
		{:else if providers.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
				<span class="material-symbols-rounded text-4xl! mb-2">business</span>
				<p>No hay proveedores registrados</p>
				<Button variant="outline" class="mt-4" onclick={handleCreateProvider}>
					<span class="material-symbols-rounded mr-2 text-lg!">add</span>
					Añadir primer proveedor
				</Button>
			</div>
		{:else if filteredProviders.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
				<span class="material-symbols-rounded text-4xl! mb-2">search_off</span>
				<p>No se encontraron proveedores</p>
			</div>
		{:else}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Nombre</TableHead>
						<TableHead>Periodo de Pago</TableHead>
						<TableHead>Creado</TableHead>
						<TableHead class="w-[100px]">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each filteredProviders as provider (provider.id)}
						<TableRow>
							<TableCell class="font-medium">
								<Tooltip>
									<TooltipTrigger class="max-w-[250px] truncate block text-left">
										{provider.name}
									</TooltipTrigger>
									<TooltipContent>
										<p>{provider.name}</p>
									</TooltipContent>
								</Tooltip>
							</TableCell>
							<TableCell class="text-muted-foreground">
								{provider.paymentPeriod} días
							</TableCell>
							<TableCell class="text-muted-foreground">{formatDate(provider.createdAt)}</TableCell>
							<TableCell>
								<div class="flex items-center gap-1">
									<Tooltip>
										<TooltipTrigger>
											<Button
												variant="ghost"
												size="sm"
												class="h-8 w-8 p-0"
												onclick={() => handleEditProvider(provider)}
											>
												<span class="material-symbols-rounded text-xl!">edit</span>
												<span class="sr-only">Editar</span>
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>Editar proveedor</p>
										</TooltipContent>
									</Tooltip>
									<Tooltip>
										<TooltipTrigger>
											<Button
												variant="ghost"
												size="sm"
												class="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
												onclick={() => handleDeleteProvider(provider)}
											>
												<span class="material-symbols-rounded text-xl!">delete</span>
												<span class="sr-only">Eliminar</span>
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>Eliminar proveedor</p>
										</TooltipContent>
									</Tooltip>
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		{/if}
	</CardContent>
</Card>

<ProviderFormModal
	bind:open={providerFormModalOpen}
	provider={selectedProvider}
	onClose={handleModalClose}
	onSuccess={handleSuccess}
/>

<ProviderDeleteDialog
	bind:open={deleteDialogOpen}
	provider={selectedProvider}
	onClose={handleModalClose}
	onSuccess={handleSuccess}
/>

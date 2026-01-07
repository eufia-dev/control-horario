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
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';
	import ExternalFormModal from './ExternalFormModal.svelte';
	import ExternalDeleteDialog from './ExternalDeleteDialog.svelte';
	import { fetchExternals, type External } from '$lib/api/externals';
	import { formatCurrency, formatDate } from './helpers';

	let externals = $state<External[]>([]);
	let loadingExternals = $state(true);
	let externalsError = $state<string | null>(null);
	let searchQuery = $state('');

	const filteredExternals = $derived(
		externals.filter((external) => {
			if (!searchQuery.trim()) return true;
			const query = searchQuery.toLowerCase();
			return external.name.toLowerCase().includes(query);
		})
	);

	let externalFormModalOpen = $state(false);
	let externalDeleteDialogOpen = $state(false);
	let selectedExternal = $state<External | null>(null);

	async function loadExternals() {
		loadingExternals = true;
		externalsError = null;
		try {
			externals = await fetchExternals();
		} catch (e) {
			externalsError = e instanceof Error ? e.message : 'Error desconocido';
		} finally {
			loadingExternals = false;
		}
	}

	onMount(() => {
		loadExternals();
	});

	function handleCreateExternal() {
		selectedExternal = null;
		externalFormModalOpen = true;
	}

	function handleEditExternal(external: External) {
		selectedExternal = external;
		externalFormModalOpen = true;
	}

	function handleDeleteExternal(external: External) {
		selectedExternal = external;
		externalDeleteDialogOpen = true;
	}

	function handleExternalModalClose() {
		selectedExternal = null;
	}

	function handleExternalSuccess() {
		loadExternals();
	}
</script>

<Card class="w-full max-w-6xl mx-auto">
	<CardHeader class="flex flex-row items-center justify-between space-y-0">
		<CardTitle class="text-2xl font-semibold tracking-tight">Externos</CardTitle>
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
			<Button onclick={handleCreateExternal}>
				<span class="material-symbols-rounded text-lg!">add</span>
				Añadir
			</Button>
		</div>
	</CardHeader>
	<CardContent>
		{#if loadingExternals}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Nombre</TableHead>
						<TableHead>Coste/hora</TableHead>
						<TableHead>Estado</TableHead>
						<TableHead>Creado</TableHead>
						<TableHead class="w-[100px]">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
						<TableRow data-placeholder-index={i}>
							<TableCell><Skeleton class="h-4 w-32" /></TableCell>
							<TableCell><Skeleton class="h-4 w-16" /></TableCell>
							<TableCell><Skeleton class="h-5 w-14 rounded-full" /></TableCell>
							<TableCell><Skeleton class="h-4 w-20" /></TableCell>
							<TableCell><Skeleton class="h-8 w-20" /></TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		{:else if externalsError}
			<div class="flex items-center justify-center py-8 text-destructive">
				<span class="material-symbols-rounded mr-2">error</span>
				{externalsError}
			</div>
		{:else if externals.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
				<span class="material-symbols-rounded text-4xl! mb-2">group_off</span>
				<p>No hay externos disponibles</p>
				<Button variant="outline" class="mt-4" onclick={handleCreateExternal}>
					<span class="material-symbols-rounded mr-2 text-lg!">add</span>
					Crear primer externo
				</Button>
			</div>
		{:else if filteredExternals.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
				<span class="material-symbols-rounded text-4xl! mb-2">search_off</span>
				<p>No se encontraron externos</p>
			</div>
		{:else}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Nombre</TableHead>
						<TableHead>Coste/hora</TableHead>
						<TableHead>Estado</TableHead>
						<TableHead>Creado</TableHead>
						<TableHead class="w-[100px]">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each filteredExternals as external (external.id)}
						<TableRow>
							<TableCell class="font-medium">
								<Tooltip>
									<TooltipTrigger class="max-w-[250px] truncate">
										{external.name}
									</TooltipTrigger>
									<TooltipContent>
										<p>{external.name}</p>
									</TooltipContent>
								</Tooltip>
							</TableCell>
							<TableCell>{formatCurrency(external.hourlyCost)}</TableCell>
							<TableCell>
								{#if external.isActive}
									<Badge variant="success">Activo</Badge>
								{:else}
									<Badge variant="destructive">Inactivo</Badge>
								{/if}
							</TableCell>
							<TableCell class="text-muted-foreground">{formatDate(external.createdAt)}</TableCell>
							<TableCell>
								<div class="flex items-center gap-1">
									<Button
										variant="ghost"
										size="sm"
										class="h-8 w-8 p-0"
										onclick={() => handleEditExternal(external)}
									>
										<span class="material-symbols-rounded text-xl!">edit</span>
										<span class="sr-only">Editar</span>
									</Button>
									<Button
										variant="ghost"
										size="sm"
										class="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
										onclick={() => handleDeleteExternal(external)}
									>
										<span class="material-symbols-rounded text-xl!">delete</span>
										<span class="sr-only">Eliminar</span>
									</Button>
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		{/if}
	</CardContent>
</Card>

<ExternalFormModal
	bind:open={externalFormModalOpen}
	external={selectedExternal}
	onClose={handleExternalModalClose}
	onSuccess={handleExternalSuccess}
/>

<ExternalDeleteDialog
	bind:open={externalDeleteDialogOpen}
	external={selectedExternal}
	onClose={handleExternalModalClose}
	onSuccess={handleExternalSuccess}
/>

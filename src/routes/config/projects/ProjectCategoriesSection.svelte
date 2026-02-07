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
	import CategoryFormModal from './CategoryFormModal.svelte';
	import CategoryDeleteDialog from './CategoryDeleteDialog.svelte';
	import { fetchProjectCategories, type ProjectCategory } from '$lib/api/project-categories';

	let categories = $state<ProjectCategory[]>([]);
	let loadingCategories = $state(true);
	let categoriesError = $state<string | null>(null);
	let searchQuery = $state('');

	const filteredCategories = $derived(
		categories.filter((category) => {
			if (!searchQuery.trim()) return true;
			const query = searchQuery.toLowerCase();
			return category.name.toLowerCase().includes(query);
		})
	);

	let categoryFormModalOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let selectedCategory = $state<ProjectCategory | null>(null);

	export async function loadCategories() {
		loadingCategories = true;
		categoriesError = null;
		try {
			categories = await fetchProjectCategories();
		} catch (e) {
			categoriesError = e instanceof Error ? e.message : 'Error desconocido';
		} finally {
			loadingCategories = false;
		}
	}

	onMount(() => {
		loadCategories();
	});

	function handleCreateCategory() {
		selectedCategory = null;
		categoryFormModalOpen = true;
	}

	function handleEditCategory(category: ProjectCategory) {
		selectedCategory = category;
		categoryFormModalOpen = true;
	}

	function handleDeleteCategory(category: ProjectCategory) {
		selectedCategory = category;
		deleteDialogOpen = true;
	}

	function handleModalClose() {
		selectedCategory = null;
	}

	function handleSuccess() {
		loadCategories();
	}
</script>

<Card class="w-full max-w-6xl mx-auto">
	<CardHeader class="flex flex-wrap items-center gap-4 space-y-0">
		<CardTitle class="text-2xl font-semibold tracking-tight">Categorías de Proyectos</CardTitle>
		<div class="hidden md:block flex-1"></div>
		<div class="relative order-3 md:order-0 w-full md:w-auto">
			<span
				class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg!"
				>search</span
			>
			<Input
				type="text"
				placeholder="Buscar por nombre"
				bind:value={searchQuery}
				class="pl-9 min-w-60"
			/>
		</div>
		<div class="order-2 md:order-0 ml-auto md:ml-0">
			<Button onclick={handleCreateCategory}>
				<span class="material-symbols-rounded text-lg!">add</span>
				Añadir
			</Button>
		</div>
	</CardHeader>
	<CardContent>
		{#if loadingCategories}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Nombre</TableHead>
						<TableHead class="w-[100px]">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each Array.from({ length: 3 }, (_, i) => i) as i (i)}
						<TableRow data-placeholder-index={i}>
							<TableCell><Skeleton class="h-4 w-32" /></TableCell>
							<TableCell><Skeleton class="h-8 w-20" /></TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		{:else if categoriesError}
			<div class="flex items-center justify-center py-8 text-destructive">
				<span class="material-symbols-rounded mr-2">error</span>
				{categoriesError}
			</div>
		{:else if categories.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
				<span class="material-symbols-rounded text-4xl! mb-2">category</span>
				<p>No hay categorías registradas</p>
				<Button variant="outline" class="mt-4" onclick={handleCreateCategory}>
					<span class="material-symbols-rounded mr-2 text-lg!">add</span>
					Añadir primera categoría
				</Button>
			</div>
		{:else if filteredCategories.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
				<span class="material-symbols-rounded text-4xl! mb-2">search_off</span>
				<p>No se encontraron categorías</p>
			</div>
		{:else}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Nombre</TableHead>
						<TableHead class="w-[100px]">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each filteredCategories as category (category.id)}
						<TableRow>
							<TableCell class="font-medium">
								<Tooltip>
									<TooltipTrigger class="max-w-[300px] truncate block text-left">
										{category.name}
									</TooltipTrigger>
									<TooltipContent>
										<p>{category.name}</p>
									</TooltipContent>
								</Tooltip>
							</TableCell>
							<TableCell>
								<div class="flex items-center gap-1">
									<Tooltip>
										<TooltipTrigger>
											<Button
												variant="ghost"
												size="sm"
												class="h-8 w-8 p-0"
												onclick={() => handleEditCategory(category)}
											>
												<span class="material-symbols-rounded text-xl!">edit</span>
												<span class="sr-only">Editar</span>
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>Editar categoría</p>
										</TooltipContent>
									</Tooltip>
									<Tooltip>
										<TooltipTrigger>
											<Button
												variant="ghost"
												size="sm"
												class="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
												onclick={() => handleDeleteCategory(category)}
											>
												<span class="material-symbols-rounded text-xl!">delete</span>
												<span class="sr-only">Eliminar</span>
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>Eliminar categoría</p>
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

<CategoryFormModal
	bind:open={categoryFormModalOpen}
	category={selectedCategory}
	onClose={handleModalClose}
	onSuccess={handleSuccess}
/>

<CategoryDeleteDialog
	bind:open={deleteDialogOpen}
	category={selectedCategory}
	onClose={handleModalClose}
	onSuccess={handleSuccess}
/>

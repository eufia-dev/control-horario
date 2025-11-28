<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth';
	import { fetchProjects, type Project } from '$lib/api/projects';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import {
		Table,
		TableHeader,
		TableBody,
		TableRow,
		TableHead,
		TableCell
	} from '$lib/components/ui/table';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Tooltip,
		TooltipContent,
		TooltipProvider,
		TooltipTrigger
	} from '$lib/components/ui/tooltip';
	import ProjectFormModal from '$lib/components/project-form-modal.svelte';
	import ProjectDeleteDialog from '$lib/components/project-delete-dialog.svelte';

	let projects = $state<Project[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Modal state
	let formModalOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let selectedProject = $state<Project | null>(null);

	const isAdmin = $derived($auth.user?.isAdmin ?? false);

	async function loadProjects() {
		loading = true;
		error = null;
		try {
			projects = await fetchProjects();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error desconocido';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadProjects();
	});

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('es-ES', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function handleCreateProject() {
		selectedProject = null;
		formModalOpen = true;
	}

	function handleEditProject(project: Project) {
		selectedProject = project;
		formModalOpen = true;
	}

	function handleDeleteProject(project: Project) {
		selectedProject = project;
		deleteDialogOpen = true;
	}

	function handleModalClose() {
		selectedProject = null;
	}

	function handleSuccess() {
		loadProjects();
	}
</script>

<div class="grow flex flex-col p-6">
	<Card class="w-full max-w-5xl mx-auto">
		<CardHeader class="flex flex-row items-center justify-between space-y-0">
			<CardTitle class="text-2xl font-semibold tracking-tight">Proyectos</CardTitle>
			{#if isAdmin}
				<Button onclick={handleCreateProject}>
					<span class="material-symbols-rounded mr-2 text-lg">add</span>
					Nuevo proyecto
				</Button>
			{/if}
		</CardHeader>
		<CardContent>
			{#if loading}
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Código</TableHead>
							<TableHead>Nombre</TableHead>
							<TableHead>Empresa</TableHead>
							<TableHead>Estado</TableHead>
							<TableHead>Creado</TableHead>
							{#if isAdmin}
								<TableHead class="w-[100px]">Acciones</TableHead>
							{/if}
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each Array(5) as _}
							<TableRow>
								<TableCell><Skeleton class="h-4 w-16" /></TableCell>
								<TableCell><Skeleton class="h-4 w-32" /></TableCell>
								<TableCell><Skeleton class="h-4 w-24" /></TableCell>
								<TableCell><Skeleton class="h-5 w-14 rounded-full" /></TableCell>
								<TableCell><Skeleton class="h-4 w-20" /></TableCell>
								{#if isAdmin}
									<TableCell><Skeleton class="h-8 w-20" /></TableCell>
								{/if}
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			{:else if error}
				<div class="flex items-center justify-center py-8 text-destructive">
					<span class="material-symbols-rounded mr-2">error</span>
					{error}
				</div>
			{:else if projects.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
					<span class="material-symbols-rounded text-4xl! mb-2">folder_off</span>
					<p>No hay proyectos disponibles</p>
					{#if isAdmin}
						<Button variant="outline" class="mt-4" onclick={handleCreateProject}>
							<span class="material-symbols-rounded mr-2 text-lg!">add</span>
							Crear primer proyecto
						</Button>
					{/if}
				</div>
			{:else}
				<TooltipProvider>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Código</TableHead>
								<TableHead>Nombre</TableHead>
								<TableHead>Empresa</TableHead>
								<TableHead>Estado</TableHead>
								<TableHead>Creado</TableHead>
								{#if isAdmin}
									<TableHead class="w-[100px]">Acciones</TableHead>
								{/if}
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each projects as project (project.id)}
								<TableRow>
									<TableCell class="font-medium">
										<Tooltip>
											<TooltipTrigger class="max-w-[120px] truncate">
												{project.code}
											</TooltipTrigger>
											<TooltipContent>
												<p>{project.code}</p>
											</TooltipContent>
										</Tooltip>
									</TableCell>
									<TableCell>
										<Tooltip>
											<TooltipTrigger class="max-w-[400px] truncate">
												{project.name}
											</TooltipTrigger>
											<TooltipContent>
												<p>{project.name}</p>
											</TooltipContent>
										</Tooltip>
									</TableCell>
									<TableCell>{project.company}</TableCell>
									<TableCell>
										{#if project.isActive}
											<Badge variant="success">Activo</Badge>
										{:else}
											<Badge variant="destructive">Inactivo</Badge>
										{/if}
									</TableCell>
									<TableCell class="text-muted-foreground">{formatDate(project.createdAt)}</TableCell>
									{#if isAdmin}
										<TableCell>
											<div class="flex items-center gap-1">
												<Button
													variant="ghost"
													size="sm"
													class="h-8 w-8 p-0"
													onclick={() => handleEditProject(project)}
												>
													<span class="material-symbols-rounded text-xl!">edit</span>
													<span class="sr-only">Editar</span>
												</Button>
												<Button
													variant="ghost"
													size="sm"
													class="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
													onclick={() => handleDeleteProject(project)}
												>
													<span class="material-symbols-rounded text-xl!">delete</span>
													<span class="sr-only">Eliminar</span>
												</Button>
											</div>
										</TableCell>
									{/if}
								</TableRow>
							{/each}
						</TableBody>
					</Table>
				</TooltipProvider>
			{/if}
		</CardContent>
	</Card>
</div>

<!-- Modals -->
<ProjectFormModal
	bind:open={formModalOpen}
	project={selectedProject}
	onClose={handleModalClose}
	onSuccess={handleSuccess}
/>

<ProjectDeleteDialog
	bind:open={deleteDialogOpen}
	project={selectedProject}
	onClose={handleModalClose}
	onSuccess={handleSuccess}
/>

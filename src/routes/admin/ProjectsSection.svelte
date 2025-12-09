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
	import {
		Tooltip,
		TooltipContent,
		TooltipProvider,
		TooltipTrigger
	} from '$lib/components/ui/tooltip';
	import ProjectFormModal from '$lib/components/project-form-modal.svelte';
	import ProjectDeleteDialog from '$lib/components/project-delete-dialog.svelte';
	import { fetchProjects, type Project } from '$lib/api/projects';
	import { formatDate } from './helpers';

	let projects = $state<Project[]>([]);
	let loadingProjects = $state(true);
	let projectsError = $state<string | null>(null);

	let projectFormModalOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let selectedProject = $state<Project | null>(null);

	async function loadProjects() {
		loadingProjects = true;
		projectsError = null;
		try {
			projects = await fetchProjects();
		} catch (e) {
			projectsError = e instanceof Error ? e.message : 'Error desconocido';
		} finally {
			loadingProjects = false;
		}
	}

	onMount(() => {
		loadProjects();
	});

	function handleCreateProject() {
		selectedProject = null;
		projectFormModalOpen = true;
	}

	function handleEditProject(project: Project) {
		selectedProject = project;
		projectFormModalOpen = true;
	}

	function handleDeleteProject(project: Project) {
		selectedProject = project;
		deleteDialogOpen = true;
	}

	function handleProjectModalClose() {
		selectedProject = null;
	}

	function handleProjectSuccess() {
		loadProjects();
	}
</script>

<Card class="w-full max-w-5xl mx-auto">
	<CardHeader class="flex flex-row items-center justify-between space-y-0">
		<CardTitle class="text-2xl font-semibold tracking-tight">Proyectos</CardTitle>
		<Button onclick={handleCreateProject}>
			<span class="material-symbols-rounded text-lg!">add</span>
			Añadir
		</Button>
	</CardHeader>
	<CardContent>
		{#if loadingProjects}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Código</TableHead>
						<TableHead>Nombre</TableHead>
						<TableHead>Estado</TableHead>
						<TableHead>Creado</TableHead>
						<TableHead class="w-[100px]">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
						<TableRow data-placeholder-index={i}>
							<TableCell><Skeleton class="h-4 w-16" /></TableCell>
							<TableCell><Skeleton class="h-4 w-32" /></TableCell>
							<TableCell><Skeleton class="h-5 w-14 rounded-full" /></TableCell>
							<TableCell><Skeleton class="h-4 w-20" /></TableCell>
							<TableCell><Skeleton class="h-8 w-20" /></TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		{:else if projectsError}
			<div class="flex items-center justify-center py-8 text-destructive">
				<span class="material-symbols-rounded mr-2">error</span>
				{projectsError}
			</div>
		{:else if projects.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
				<span class="material-symbols-rounded text-4xl! mb-2">folder_off</span>
				<p>No hay proyectos disponibles</p>
				<Button variant="outline" class="mt-4" onclick={handleCreateProject}>
					<span class="material-symbols-rounded mr-2 text-lg!">add</span>
					Crear primer proyecto
				</Button>
			</div>
		{:else}
			<TooltipProvider>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Código</TableHead>
							<TableHead>Nombre</TableHead>
							<TableHead>Estado</TableHead>
							<TableHead>Creado</TableHead>
							<TableHead class="w-[100px]">Acciones</TableHead>
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
								<TableCell>
									{#if project.isActive}
										<Badge variant="success">Activo</Badge>
									{:else}
										<Badge variant="destructive">Inactivo</Badge>
									{/if}
								</TableCell>
								<TableCell class="text-muted-foreground">{formatDate(project.createdAt)}</TableCell>
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
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			</TooltipProvider>
		{/if}
	</CardContent>
</Card>

<ProjectFormModal
	bind:open={projectFormModalOpen}
	project={selectedProject}
	onClose={handleProjectModalClose}
	onSuccess={handleProjectSuccess}
/>

<ProjectDeleteDialog
	bind:open={deleteDialogOpen}
	project={selectedProject}
	onClose={handleProjectModalClose}
	onSuccess={handleProjectSuccess}
/>

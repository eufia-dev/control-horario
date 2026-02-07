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
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import ProjectFormModal from './ProjectFormModal.svelte';
	import ProjectDeleteDialog from './ProjectDeleteDialog.svelte';
	import { fetchProjects, type Project } from '$lib/api/projects';
	import { fetchTeams, type Team } from '$lib/api/teams';
	import { formatDate } from '../helpers';
	import {
		isAdmin as isAdminStore,
		userTeamId as userTeamIdStore,
		canAccessAdmin as canAccessAdminStore
	} from '$lib/stores/auth';
	import { canEditProject, canDeleteProject } from '$lib/permissions';

	let projects = $state<Project[]>([]);
	let teams = $state<Team[]>([]);
	let loadingProjects = $state(true);
	let projectsError = $state<string | null>(null);
	let searchQuery = $state('');
	let teamFilter = $state<string>('');
	let isAdmin = $state(false);
	let currentUserTeamId = $state<string | null>(null);
	let canAccess = $state(false);

	$effect(() => {
		const unsub = isAdminStore.subscribe((value) => {
			isAdmin = value;
		});
		return unsub;
	});

	$effect(() => {
		const unsub = userTeamIdStore.subscribe((value) => {
			currentUserTeamId = value;
		});
		return unsub;
	});

	$effect(() => {
		const unsub = canAccessAdminStore.subscribe((value) => {
			canAccess = value;
		});
		return unsub;
	});

	const filteredProjects = $derived(
		projects.filter((project) => {
			// Search filter
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase();
				if (
					!project.code.toLowerCase().includes(query) &&
					!project.name.toLowerCase().includes(query)
				) {
					return false;
				}
			}
			// Team filter
			if (teamFilter && teamFilter !== '') {
				if (teamFilter === 'global') {
					if (project.teamId !== null) return false;
				} else if (project.teamId !== teamFilter) {
					return false;
				}
			}
			return true;
		})
	);

	const teamFilterLabel = $derived(
		teamFilter === ''
			? 'Todos los proyectos'
			: teamFilter === 'global'
				? 'Global (sin equipo)'
				: (teams.find((t) => t.id === teamFilter)?.name ?? 'Todos los proyectos')
	);

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

	async function loadTeams() {
		try {
			teams = await fetchTeams();
		} catch (e) {
			console.error('Error loading teams:', e);
		}
	}

	onMount(() => {
		loadProjects();
		if (isAdmin) {
			loadTeams();
		}
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

<Card class="w-full max-w-6xl 2xl:max-w-7xl mx-auto">
	<CardHeader class="flex flex-wrap items-center gap-4 space-y-0">
		<CardTitle class="text-2xl font-semibold tracking-tight">Proyectos</CardTitle>
		<div class="hidden md:block flex-1"></div>
		<div class="relative order-3 md:order-0 w-full md:w-auto">
			<span
				class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg!"
				>search</span
			>
			<Input
				type="text"
				placeholder="Buscar por código o nombre"
				bind:value={searchQuery}
				class="pl-9"
			/>
		</div>
		{#if isAdmin && teams.length > 0}
			<div class="order-4 md:order-0 w-full md:w-auto">
				<Select type="single" bind:value={teamFilter}>
					<SelectTrigger class="w-full md:w-[180px]">
						{teamFilterLabel}
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="" label="Todos los proyectos" />
						<SelectItem value="global" label="Global (sin equipo)" />
						{#each teams as team (team.id)}
							<SelectItem value={team.id} label={team.name} />
						{/each}
					</SelectContent>
				</Select>
			</div>
		{/if}
		{#if canAccess}
			<div class="order-2 md:order-0 ml-auto md:ml-0">
				<Button onclick={handleCreateProject}>
					<span class="material-symbols-rounded text-lg!">add</span>
					Añadir
				</Button>
			</div>
		{/if}
	</CardHeader>
	<CardContent>
		{#if loadingProjects}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Código</TableHead>
						<TableHead>Nombre</TableHead>
						<TableHead>Categoría</TableHead>
						<TableHead>Estado</TableHead>
						<TableHead>Equipo</TableHead>
						<TableHead>Creado</TableHead>
						<TableHead class="w-[100px]">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
						<TableRow data-placeholder-index={i}>
							<TableCell><Skeleton class="h-4 w-16" /></TableCell>
							<TableCell><Skeleton class="h-4 w-32" /></TableCell>
							<TableCell><Skeleton class="h-5 w-20 rounded-full" /></TableCell>
							<TableCell><Skeleton class="h-5 w-14 rounded-full" /></TableCell>
							<TableCell><Skeleton class="h-5 w-20 rounded-full" /></TableCell>
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
		{:else if filteredProjects.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
				<span class="material-symbols-rounded text-4xl! mb-2">search_off</span>
				<p>No se encontraron proyectos</p>
			</div>
		{:else}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Código</TableHead>
						<TableHead>Nombre</TableHead>
						<TableHead>Categoría</TableHead>
						<TableHead>Estado</TableHead>
						<TableHead>Equipo</TableHead>
						<TableHead>Creado</TableHead>
						<TableHead class="w-[100px]">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each filteredProjects as project (project.id)}
						{@const userRole = isAdmin ? 'ADMIN' : 'TEAM_LEADER'}
						{@const canEdit = canEditProject(userRole, currentUserTeamId, project)}
						{@const canDelete = canDeleteProject(userRole, currentUserTeamId, project)}
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
								{#if project.category}
									<Badge variant="outline">
										{project.category.name}
									</Badge>
								{:else}
									<span class="text-muted-foreground">—</span>
								{/if}
							</TableCell>
							<TableCell>
								{#if project.isActive}
									<Badge variant="success">Activo</Badge>
								{:else}
									<Badge variant="destructive">Inactivo</Badge>
								{/if}
							</TableCell>
							<TableCell>
								{#if project.team}
									<Badge variant="outline">{project.team.name}</Badge>
								{:else}
									<Badge variant="secondary">Global</Badge>
								{/if}
							</TableCell>
							<TableCell class="text-muted-foreground">{formatDate(project.createdAt)}</TableCell>
							<TableCell>
								<div class="flex items-center gap-1">
									{#if canEdit}
										<Button
											variant="ghost"
											size="sm"
											class="h-8 w-8 p-0"
											onclick={() => handleEditProject(project)}
										>
											<span class="material-symbols-rounded text-xl!">edit</span>
											<span class="sr-only">Editar</span>
										</Button>
									{/if}
									{#if canDelete}
										<Button
											variant="ghost"
											size="sm"
											class="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
											onclick={() => handleDeleteProject(project)}
										>
											<span class="material-symbols-rounded text-xl!">delete</span>
											<span class="sr-only">Eliminar</span>
										</Button>
									{/if}
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
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

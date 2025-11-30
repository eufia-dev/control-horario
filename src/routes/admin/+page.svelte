<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import { fetchProjects, fetchCompanies, type Project, type Company } from '$lib/api/projects';
	import { fetchUsers, type User } from '$lib/api/users';
	import { fetchExternals, type External } from '$lib/api/externals';
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
	import UserFormModal from '$lib/components/user-form-modal.svelte';
	import ExternalFormModal from '$lib/components/external-form-modal.svelte';
	import ExternalDeleteDialog from '$lib/components/external-delete-dialog.svelte';

	// Projects state
	let projects = $state<Project[]>([]);
	let companies = $state<Company[]>([]);
	let loadingProjects = $state(true);
	let projectsError = $state<string | null>(null);

	// Users state
	let users = $state<User[]>([]);
	let loadingUsers = $state(true);
	let usersError = $state<string | null>(null);

	// Externals state
	let externals = $state<External[]>([]);
	let loadingExternals = $state(true);
	let externalsError = $state<string | null>(null);

	// Project modal state
	let projectFormModalOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let selectedProject = $state<Project | null>(null);

	// User modal state
	let userFormModalOpen = $state(false);
	let selectedUser = $state<User | null>(null);

	// External modal state
	let externalFormModalOpen = $state(false);
	let externalDeleteDialogOpen = $state(false);
	let selectedExternal = $state<External | null>(null);

	const isAdmin = $derived($auth.user?.isAdmin ?? false);
	const hasSingleCompany = $derived(companies.length === 1);

	async function loadProjects() {
		loadingProjects = true;
		projectsError = null;
		try {
			[projects, companies] = await Promise.all([fetchProjects(), fetchCompanies()]);
		} catch (e) {
			projectsError = e instanceof Error ? e.message : 'Error desconocido';
		} finally {
			loadingProjects = false;
		}
	}

	async function loadUsers() {
		loadingUsers = true;
		usersError = null;
		try {
			users = await fetchUsers();
		} catch (e) {
			usersError = e instanceof Error ? e.message : 'Error desconocido';
		} finally {
			loadingUsers = false;
		}
	}

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
		// Admin guard: redirect non-admins to home
		if (!$auth.user?.isAdmin) {
			goto('/');
			return;
		}

		loadProjects();
		loadUsers();
		loadExternals();
	});

	// Reactive guard for when auth state changes
	$effect(() => {
		if (!$auth.isInitializing && !$auth.user?.isAdmin) {
			goto('/');
		}
	});

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('es-ES', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('es-ES', {
			style: 'currency',
			currency: 'EUR'
		}).format(value);
	}

	// Project handlers
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

	// User handlers
	function handleEditUser(user: User) {
		selectedUser = user;
		userFormModalOpen = true;
	}

	function handleUserModalClose() {
		selectedUser = null;
	}

	function handleUserSuccess() {
		loadUsers();
	}

	// External handlers
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

{#if isAdmin}
	<div class="grow flex flex-col gap-6 p-6">
		<!-- Projects Card -->
		<Card class="w-full max-w-5xl mx-auto">
			<CardHeader class="flex flex-row items-center justify-between space-y-0">
				<CardTitle class="text-2xl font-semibold tracking-tight">Proyectos</CardTitle>
				<Button onclick={handleCreateProject}>
					<span class="material-symbols-rounded mr-2 text-lg">add</span>
					Nuevo proyecto
				</Button>
			</CardHeader>
			<CardContent>
				{#if loadingProjects}
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Código</TableHead>
								<TableHead>Nombre</TableHead>
								{#if !hasSingleCompany}
									<TableHead>Empresa</TableHead>
								{/if}
								<TableHead>Estado</TableHead>
								<TableHead>Creado</TableHead>
								<TableHead class="w-[100px]">Acciones</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each Array(5) as _}
								<TableRow>
									<TableCell><Skeleton class="h-4 w-16" /></TableCell>
									<TableCell><Skeleton class="h-4 w-32" /></TableCell>
									{#if !hasSingleCompany}
										<TableCell><Skeleton class="h-4 w-24" /></TableCell>
									{/if}
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
									{#if !hasSingleCompany}
										<TableHead>Empresa</TableHead>
									{/if}
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
										{#if !hasSingleCompany}
											<TableCell>{project.companyName}</TableCell>
										{/if}
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

		<!-- Users Card -->
		<Card class="w-full max-w-5xl mx-auto">
			<CardHeader>
				<CardTitle class="text-2xl font-semibold tracking-tight">Usuarios</CardTitle>
			</CardHeader>
			<CardContent>
				{#if loadingUsers}
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Nombre</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Coste/hora</TableHead>
								<TableHead>Estado</TableHead>
								<TableHead>Rol</TableHead>
								<TableHead>Creado</TableHead>
								<TableHead class="w-[80px]">Acciones</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each Array(5) as _}
								<TableRow>
									<TableCell><Skeleton class="h-4 w-28" /></TableCell>
									<TableCell><Skeleton class="h-4 w-40" /></TableCell>
									<TableCell><Skeleton class="h-4 w-16" /></TableCell>
									<TableCell><Skeleton class="h-5 w-14 rounded-full" /></TableCell>
									<TableCell><Skeleton class="h-5 w-16 rounded-full" /></TableCell>
									<TableCell><Skeleton class="h-4 w-20" /></TableCell>
									<TableCell><Skeleton class="h-8 w-8" /></TableCell>
								</TableRow>
							{/each}
						</TableBody>
					</Table>
				{:else if usersError}
					<div class="flex items-center justify-center py-8 text-destructive">
						<span class="material-symbols-rounded mr-2">error</span>
						{usersError}
					</div>
				{:else if users.length === 0}
					<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
						<span class="material-symbols-rounded text-4xl! mb-2">person_off</span>
						<p>No hay usuarios disponibles</p>
					</div>
				{:else}
					<TooltipProvider>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Nombre</TableHead>
									<TableHead>Email</TableHead>
									<TableHead>Coste/hora</TableHead>
									<TableHead>Estado</TableHead>
									<TableHead>Rol</TableHead>
									<TableHead>Creado</TableHead>
									<TableHead class="w-[80px]">Acciones</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#each users as user (user.id)}
									<TableRow>
										<TableCell class="font-medium">
											<Tooltip>
												<TooltipTrigger class="max-w-[150px] truncate">
													{user.name}
												</TooltipTrigger>
												<TooltipContent>
													<p>{user.name}</p>
												</TooltipContent>
											</Tooltip>
										</TableCell>
										<TableCell>
											<Tooltip>
												<TooltipTrigger class="max-w-[200px] truncate">
													{user.email}
												</TooltipTrigger>
												<TooltipContent>
													<p>{user.email}</p>
												</TooltipContent>
											</Tooltip>
										</TableCell>
										<TableCell>{formatCurrency(user.hourlyCost)}</TableCell>
										<TableCell>
											{#if user.isActive}
												<Badge variant="success">Activo</Badge>
											{:else}
												<Badge variant="destructive">Inactivo</Badge>
											{/if}
										</TableCell>
										<TableCell>
											{#if user.isAdmin}
												<Badge variant="default">Admin</Badge>
											{:else}
												<Badge variant="secondary">Usuario</Badge>
											{/if}
										</TableCell>
										<TableCell class="text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="sm"
												class="h-8 w-8 p-0"
												onclick={() => handleEditUser(user)}
											>
												<span class="material-symbols-rounded text-xl!">edit</span>
												<span class="sr-only">Editar</span>
											</Button>
										</TableCell>
									</TableRow>
								{/each}
							</TableBody>
						</Table>
					</TooltipProvider>
				{/if}
			</CardContent>
		</Card>

		<!-- Externals Card -->
		<Card class="w-full max-w-5xl mx-auto">
			<CardHeader class="flex flex-row items-center justify-between space-y-0">
				<CardTitle class="text-2xl font-semibold tracking-tight">Externos</CardTitle>
				<Button onclick={handleCreateExternal}>
					<span class="material-symbols-rounded mr-2 text-lg">add</span>
					Nuevo externo
				</Button>
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
							{#each Array(5) as _}
								<TableRow>
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
				{:else}
					<TooltipProvider>
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
								{#each externals as external (external.id)}
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
					</TooltipProvider>
				{/if}
			</CardContent>
		</Card>
	</div>

	<!-- Project Modals -->
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

	<!-- User Modal -->
	<UserFormModal
		bind:open={userFormModalOpen}
		user={selectedUser}
		onClose={handleUserModalClose}
		onSuccess={handleUserSuccess}
	/>

	<!-- External Modals -->
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
{/if}


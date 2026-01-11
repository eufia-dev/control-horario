<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
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
	import UserFormModal from './UserFormModal.svelte';
	import UserDeleteDialog from './UserDeleteDialog.svelte';
	import InvitationFormModal from '$lib/components/InvitationFormModal.svelte';
	import TeamFormModal from './TeamFormModal.svelte';
	import TeamMemberRemoveDialog from './TeamMemberRemoveDialog.svelte';
	import { fetchUsers, type User } from '$lib/api/users';
	import { fetchTeams, addMyTeamMember, type Team } from '$lib/api/teams';
	import { formatCurrency, formatDate, getRoleBadge, getRelationTypeBadge } from './helpers';
	import {
		isAdmin as isAdminStore,
		userTeamId as userTeamIdStore,
		isTeamLeader as isTeamLeaderStore
	} from '$lib/stores/auth';
	import { canEditUser, canDeleteUser } from '$lib/permissions';

	type Props = {
		onUserUpdated?: () => void;
	};

	let { onUserUpdated }: Props = $props();

	let users = $state<User[]>([]);
	let teams = $state<Team[]>([]);
	let loadingUsers = $state(true);
	let usersError = $state<string | null>(null);
	let searchQuery = $state('');
	let teamFilter = $state<string>('');
	let isAdmin = $state(false);
	let isTeamLeader = $state(false);
	let currentUserTeamId = $state<string | null>(null);

	// Team leader mode state
	let addingMember = $state(false);
	let selectedUserId = $state<string | undefined>(undefined);
	let actionError = $state<string | null>(null);
	let teamFormModalOpen = $state(false);
	let memberRemoveDialogOpen = $state(false);
	let memberToRemove = $state<{ id: string; name: string; email: string } | null>(null);

	$effect(() => {
		const unsub = isAdminStore.subscribe((value) => {
			isAdmin = value;
		});
		return unsub;
	});

	$effect(() => {
		const unsub = isTeamLeaderStore.subscribe((value) => {
			isTeamLeader = value;
		});
		return unsub;
	});

	$effect(() => {
		const unsub = userTeamIdStore.subscribe((value) => {
			currentUserTeamId = value;
		});
		return unsub;
	});

	// Team leader derived values
	const teamMembers = $derived(users.filter((user) => user.team?.id === currentUserTeamId));

	const teamName = $derived(
		users.find((user) => user.team?.id === currentUserTeamId)?.team?.name ?? 'Mi Equipo'
	);

	const teamLeaders = $derived(
		teamMembers.filter((m) => m.role === 'TEAM_LEADER').map((m) => ({ id: m.id, name: m.name }))
	);

	const availableUsers = $derived(users.filter((user) => user.team === null));

	const selectedUserLabel = $derived(
		availableUsers.find((u) => u.id === selectedUserId)?.name ?? 'Seleccionar usuario'
	);

	const teamForModal = $derived<Team | null>(
		currentUserTeamId
			? {
					id: currentUserTeamId,
					name: teamName,
					memberCount: teamMembers.length,
					leaders: teamLeaders,
					createdAt: ''
				}
			: null
	);

	const filteredUsers = $derived(
		users.filter((user) => {
			// For team leaders (non-admin), only show users from their team
			if (isTeamLeader && !isAdmin) {
				if (user.team?.id !== currentUserTeamId) {
					return false;
				}
			}
			// Search filter
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase();
				if (!user.name.toLowerCase().includes(query) && !user.email.toLowerCase().includes(query)) {
					return false;
				}
			}
			// Team filter (only applies for admins)
			if (isAdmin && teamFilter && teamFilter !== '') {
				if (teamFilter === 'no-team') {
					if (user.team !== null) return false;
				} else if (user.team?.id !== teamFilter) {
					return false;
				}
			}
			return true;
		})
	);

	const teamFilterLabel = $derived(
		teamFilter === ''
			? 'Todos los equipos'
			: teamFilter === 'no-team'
				? 'Sin equipo'
				: (teams.find((t) => t.id === teamFilter)?.name ?? 'Todos los equipos')
	);

	let userFormModalOpen = $state(false);
	let userDeleteDialogOpen = $state(false);
	let selectedUser = $state<User | null>(null);
	let invitationFormModalOpen = $state(false);

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

	async function loadTeams() {
		try {
			teams = await fetchTeams();
		} catch (e) {
			// Silently fail, teams filter is not critical
			console.error('Error loading teams:', e);
		}
	}

	onMount(() => {
		loadUsers();
		if (isAdmin) {
			loadTeams();
		}
	});

	function handleEditUser(user: User) {
		selectedUser = user;
		userFormModalOpen = true;
	}

	function handleDeleteUser(user: User) {
		selectedUser = user;
		userDeleteDialogOpen = true;
	}

	function handleUserModalClose() {
		selectedUser = null;
	}

	function handleUserSuccess() {
		loadUsers();
		onUserUpdated?.();
	}

	function handleInviteUser() {
		invitationFormModalOpen = true;
	}

	// Team leader functions
	async function handleAddMember() {
		if (!currentUserTeamId || !selectedUserId || addingMember) return;

		addingMember = true;
		actionError = null;

		try {
			await addMyTeamMember(selectedUserId);
			selectedUserId = undefined;
			await loadUsers();
		} catch (e) {
			actionError = e instanceof Error ? e.message : 'Error al añadir miembro';
		} finally {
			addingMember = false;
		}
	}

	function handleRemoveMember(user: User) {
		memberToRemove = { id: user.id, name: user.name, email: user.email };
		memberRemoveDialogOpen = true;
	}

	function handleMemberRemoveClose() {
		memberToRemove = null;
	}

	function handleMemberRemoveSuccess() {
		loadUsers();
	}

	function handleEditTeam() {
		teamFormModalOpen = true;
	}
</script>

<Card class="w-full max-w-6xl mx-auto">
	<CardHeader class="flex flex-row items-center justify-between space-y-0">
		{#if isTeamLeader && !isAdmin}
			<div class="flex items-center gap-4">
				<div class="flex items-center gap-2">
					<span class="material-symbols-rounded text-2xl! text-muted-foreground">groups</span>
					<CardTitle class="text-2xl font-semibold tracking-tight">{teamName}</CardTitle>
				</div>
				{#if !loadingUsers && !usersError}
					<Badge variant="secondary">{teamMembers.length} miembros</Badge>
				{/if}
			</div>
		{:else}
			<CardTitle class="text-2xl font-semibold tracking-tight">Usuarios</CardTitle>
		{/if}
		<div class="flex items-center gap-4">
			<div class="relative">
				<span
					class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg!"
					>search</span
				>
				<Input
					type="text"
					placeholder="Buscar por nombre o email..."
					bind:value={searchQuery}
					class="pl-9 mr-9"
				/>
			</div>
			{#if isAdmin && teams.length > 0}
				<Select type="single" bind:value={teamFilter}>
					<SelectTrigger class="w-[180px]">
						{teamFilterLabel}
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="" label="Todos los equipos" />
						<SelectItem value="no-team" label="Sin equipo" />
						{#each teams as team (team.id)}
							<SelectItem value={team.id} label={team.name} />
						{/each}
					</SelectContent>
				</Select>
			{/if}
			{#if isAdmin}
				<Button onclick={handleInviteUser}>
					<span class="material-symbols-rounded text-lg!">person_add</span>
					Invitar usuario
				</Button>
			{:else if isTeamLeader && !loadingUsers && !usersError}
				<Button variant="outline" onclick={handleEditTeam}>
					<span class="material-symbols-rounded text-lg!">edit</span>
					Editar equipo
				</Button>
			{/if}
		</div>
	</CardHeader>
	<CardContent>
		<!-- Team leader: Add member section -->
		{#if isTeamLeader && !isAdmin && !loadingUsers && !usersError}
			<div class="pb-4 mb-4 border-b">
				<span class="text-sm font-medium mb-2 block">Añadir miembro al equipo</span>
				<div class="flex gap-2">
					<Select type="single" bind:value={selectedUserId} disabled={addingMember || loadingUsers}>
						<SelectTrigger class="flex-1">
							{selectedUserLabel}
						</SelectTrigger>
						<SelectContent>
							{#if availableUsers.length === 0}
								<div class="px-2 py-4 text-sm text-muted-foreground text-center">
									No hay usuarios disponibles
								</div>
							{:else}
								{#each availableUsers as user (user.id)}
									<SelectItem value={user.id} label={`${user.name} (${user.email})`} />
								{/each}
							{/if}
						</SelectContent>
					</Select>
					<Button onclick={handleAddMember} disabled={!selectedUserId || addingMember}>
						{#if addingMember}
							<span class="material-symbols-rounded animate-spin text-lg!">progress_activity</span>
						{:else}
							<span class="material-symbols-rounded text-lg!">person_add</span>
						{/if}
						Añadir
					</Button>
				</div>
				{#if actionError}
					<div class="text-sm text-destructive mt-2">{actionError}</div>
				{/if}
			</div>
		{/if}
		{#if loadingUsers}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Nombre</TableHead>
						<TableHead>Email</TableHead>
						<TableHead>Relación</TableHead>
						<TableHead>Coste/hora</TableHead>
						<TableHead>Estado</TableHead>
						<TableHead>Rol</TableHead>
						<TableHead>Equipo</TableHead>
						<TableHead>Creado</TableHead>
						<TableHead class="w-[100px]">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
						<TableRow data-placeholder-index={i}>
							<TableCell><Skeleton class="h-4 w-28" /></TableCell>
							<TableCell><Skeleton class="h-4 w-40" /></TableCell>
							<TableCell><Skeleton class="h-5 w-16 rounded-full" /></TableCell>
							<TableCell><Skeleton class="h-4 w-16" /></TableCell>
							<TableCell><Skeleton class="h-5 w-14 rounded-full" /></TableCell>
							<TableCell><Skeleton class="h-5 w-16 rounded-full" /></TableCell>
							<TableCell><Skeleton class="h-5 w-20 rounded-full" /></TableCell>
							<TableCell><Skeleton class="h-4 w-20" /></TableCell>
							<TableCell><Skeleton class="h-8 w-16" /></TableCell>
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
				<Button variant="outline" class="mt-4" onclick={handleInviteUser}>
					<span class="material-symbols-rounded mr-2 text-lg!">person_add</span>
					Invitar primer usuario
				</Button>
			</div>
		{:else if filteredUsers.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
				<span class="material-symbols-rounded text-4xl! mb-2">search_off</span>
				<p>No se encontraron usuarios</p>
			</div>
		{:else}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Nombre</TableHead>
						<TableHead>Email</TableHead>
						<TableHead>Relación</TableHead>
						<TableHead>Coste/hora</TableHead>
						<TableHead>Estado</TableHead>
						<TableHead>Rol</TableHead>
						<TableHead>Equipo</TableHead>
						<TableHead>Creado</TableHead>
						<TableHead class="w-[100px]">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each filteredUsers as user (user.id)}
						{@const roleBadge = getRoleBadge(user.role)}
						{@const relationBadge = getRelationTypeBadge(user.relation)}
						{@const userRole = isAdmin ? 'ADMIN' : 'TEAM_LEADER'}
						{@const canEdit = canEditUser(userRole, currentUserTeamId, user)}
						{@const canDelete = canDeleteUser(userRole, currentUserTeamId, user)}
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
							<TableCell>
								<Badge variant={relationBadge.variant}>{relationBadge.label}</Badge>
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
								<Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
							</TableCell>
							<TableCell>
								{#if user.team}
									<Badge variant="outline">{user.team.name}</Badge>
								{:else}
									<span class="text-muted-foreground">-</span>
								{/if}
							</TableCell>
							<TableCell class="text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
							<TableCell>
								<div class="flex items-center gap-1">
									<Tooltip>
										<TooltipTrigger>
											<Button
												variant="ghost"
												size="sm"
												class="h-8 w-8 p-0"
												onclick={() => goto(resolve(`/admin/users/${user.id}`))}
											>
												<span class="material-symbols-rounded text-xl!">schedule</span>
												<span class="sr-only">Ver registros</span>
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>Ver registros</p>
										</TooltipContent>
									</Tooltip>
									{#if canEdit}
										<Tooltip>
											<TooltipTrigger>
												<Button
													variant="ghost"
													size="sm"
													class="h-8 w-8 p-0"
													onclick={() => handleEditUser(user)}
												>
													<span class="material-symbols-rounded text-xl!">edit</span>
													<span class="sr-only">Editar</span>
												</Button>
											</TooltipTrigger>
											<TooltipContent>
												<p>Editar usuario</p>
											</TooltipContent>
										</Tooltip>
									{/if}
									{#if canDelete}
										<Tooltip>
											<TooltipTrigger>
												<Button
													variant="ghost"
													size="sm"
													class="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
													onclick={() => handleDeleteUser(user)}
												>
													<span class="material-symbols-rounded text-xl!">delete</span>
													<span class="sr-only">Eliminar</span>
												</Button>
											</TooltipTrigger>
											<TooltipContent>
												<p>Eliminar usuario</p>
											</TooltipContent>
										</Tooltip>
									{/if}
									{#if isTeamLeader && !isAdmin && user.team?.id === currentUserTeamId && user.role !== 'TEAM_LEADER'}
										<Tooltip>
											<TooltipTrigger>
												<Button
													variant="ghost"
													size="sm"
													class="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
													onclick={() => handleRemoveMember(user)}
												>
													<span class="material-symbols-rounded text-lg!">person_remove</span>
													<span class="sr-only">Eliminar del equipo</span>
												</Button>
											</TooltipTrigger>
											<TooltipContent>
												<p>Eliminar del equipo</p>
											</TooltipContent>
										</Tooltip>
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

<UserFormModal
	bind:open={userFormModalOpen}
	user={selectedUser}
	onClose={handleUserModalClose}
	onSuccess={handleUserSuccess}
/>

<UserDeleteDialog
	bind:open={userDeleteDialogOpen}
	user={selectedUser}
	onClose={handleUserModalClose}
	onSuccess={handleUserSuccess}
/>

<InvitationFormModal bind:open={invitationFormModalOpen} />

{#if isTeamLeader && !isAdmin && teamForModal}
	<TeamFormModal
		bind:open={teamFormModalOpen}
		team={teamForModal}
		teamMembers={teamMembers.map((m) => ({ id: m.id, name: m.name, email: m.email, role: m.role }))}
		isMyTeam={true}
		onClose={() => {}}
		onSuccess={loadUsers}
	/>
{/if}

<TeamMemberRemoveDialog
	bind:open={memberRemoveDialogOpen}
	member={memberToRemove}
	teamName={teamName}
	onClose={handleMemberRemoveClose}
	onSuccess={handleMemberRemoveSuccess}
/>

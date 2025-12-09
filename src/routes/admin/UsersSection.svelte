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
	import UserFormModal from '$lib/components/user-form-modal.svelte';
	import UserDeleteDialog from '$lib/components/user-delete-dialog.svelte';
	import InvitationFormModal from '$lib/components/invitation-form-modal.svelte';
	import { fetchUsers, type User } from '$lib/api/users';
	import { formatCurrency, formatDate, getRoleBadge, getRelationTypeBadge } from './helpers';

	let users = $state<User[]>([]);
	let loadingUsers = $state(true);
	let usersError = $state<string | null>(null);

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

	onMount(() => {
		loadUsers();
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
	}

	function handleInviteUser() {
		invitationFormModalOpen = true;
	}
</script>

<Card class="w-full max-w-5xl mx-auto">
	<CardHeader class="flex flex-row items-center justify-between space-y-0">
		<CardTitle class="text-2xl font-semibold tracking-tight">Usuarios</CardTitle>
		<Button onclick={handleInviteUser}>
			<span class="material-symbols-rounded text-lg!">person_add</span>
			Invitar usuario
		</Button>
	</CardHeader>
	<CardContent>
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
						<TableHead>Creado</TableHead>
						<TableHead class="w-[100px]">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each Array(5) as _}
						<TableRow>
							<TableCell><Skeleton class="h-4 w-28" /></TableCell>
							<TableCell><Skeleton class="h-4 w-40" /></TableCell>
							<TableCell><Skeleton class="h-5 w-16 rounded-full" /></TableCell>
							<TableCell><Skeleton class="h-4 w-16" /></TableCell>
							<TableCell><Skeleton class="h-5 w-14 rounded-full" /></TableCell>
							<TableCell><Skeleton class="h-5 w-16 rounded-full" /></TableCell>
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
		{:else}
			<TooltipProvider>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Nombre</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Relación</TableHead>
							<TableHead>Coste/hora</TableHead>
							<TableHead>Estado</TableHead>
							<TableHead>Rol</TableHead>
							<TableHead>Creado</TableHead>
							<TableHead class="w-[100px]">Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each users as user (user.id)}
							{@const roleBadge = getRoleBadge(user.role)}
							{@const relationBadge = getRelationTypeBadge(user.relationType)}
							{@const isOwner = user.role === 'OWNER'}
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
								<TableCell class="text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
								<TableCell>
									<div class="flex items-center gap-1">
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
										{#if !isOwner}
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

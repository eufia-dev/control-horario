<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import {
		fetchTeam,
		addTeamMember,
		removeTeamMember,
		type Team,
		type TeamDetail
	} from '$lib/api/teams';
	import { fetchUsers, type User } from '$lib/api/users';
	import { getRoleBadge } from './helpers';

	type Props = {
		open: boolean;
		team: Team | null;
		onClose: () => void;
		onSuccess: () => void;
	};

	let { open = $bindable(), team = null, onClose, onSuccess }: Props = $props();

	let teamDetail = $state<TeamDetail | null>(null);
	let allUsers = $state<User[]>([]);
	let loading = $state(false);
	let loadingUsers = $state(false);
	let error = $state<string | null>(null);
	let actionError = $state<string | null>(null);
	let addingMember = $state(false);
	let removingMemberId = $state<string | null>(null);
	let selectedUserId = $state<string | undefined>(undefined);

	// Users available to add (not already in this team)
	const availableUsers = $derived(
		allUsers.filter((user) => {
			// Don't show users already in this team
			if (teamDetail?.members.some((m) => m.id === user.id)) {
				return false;
			}
			return true;
		})
	);

	const selectedUserLabel = $derived(
		availableUsers.find((u) => u.id === selectedUserId)?.name ?? 'Seleccionar usuario'
	);

	async function loadTeamDetail() {
		if (!team) return;
		loading = true;
		error = null;
		try {
			teamDetail = await fetchTeam(team.id);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar detalles del equipo';
		} finally {
			loading = false;
		}
	}

	async function loadUsers() {
		loadingUsers = true;
		try {
			allUsers = await fetchUsers();
		} catch (e) {
			// Silently fail, users list is not critical
			console.error('Error loading users:', e);
		} finally {
			loadingUsers = false;
		}
	}

	$effect(() => {
		if (open && team) {
			loadTeamDetail();
			loadUsers();
		}
	});

	$effect(() => {
		if (!open) {
			teamDetail = null;
			error = null;
			actionError = null;
			selectedUserId = undefined;
		}
	});

	async function handleAddMember() {
		if (!team || !selectedUserId || addingMember) return;

		addingMember = true;
		actionError = null;

		try {
			await addTeamMember(team.id, selectedUserId);
			selectedUserId = undefined;
			await loadTeamDetail();
			onSuccess();
		} catch (e) {
			actionError = e instanceof Error ? e.message : 'Error al añadir miembro';
		} finally {
			addingMember = false;
		}
	}

	async function handleRemoveMember(userId: string) {
		if (!team || removingMemberId) return;

		removingMemberId = userId;
		actionError = null;

		try {
			await removeTeamMember(team.id, userId);
			await loadTeamDetail();
			onSuccess();
		} catch (e) {
			actionError = e instanceof Error ? e.message : 'Error al eliminar miembro';
		} finally {
			removingMemberId = null;
		}
	}

	function handleClose() {
		open = false;
		onClose();
	}
</script>

<Dialog bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<DialogContent class="sm:max-w-lg">
		<DialogHeader>
			<DialogTitle>Gestionar Miembros</DialogTitle>
			<DialogDescription>
				{#if team}
					Añade o elimina miembros del equipo <strong>{team.name}</strong>.
				{/if}
			</DialogDescription>
		</DialogHeader>

		<div class="py-4">
			{#if loading}
				<div class="space-y-3">
					{#each Array.from({ length: 3 }, (_, i) => i) as i (i)}
						<div class="flex items-center gap-3">
							<Skeleton class="h-10 w-10 rounded-full" />
							<div class="flex-1">
								<Skeleton class="h-4 w-32 mb-1" />
								<Skeleton class="h-3 w-48" />
							</div>
						</div>
					{/each}
				</div>
			{:else if error}
				<div class="flex items-center justify-center py-8 text-destructive">
					<span class="material-symbols-rounded mr-2">error</span>
					{error}
				</div>
			{:else if teamDetail}
				<!-- Add member section -->
				<div class="mb-6 pb-4 border-b">
					<span class="text-sm font-medium mb-2 block">Añadir miembro</span>
					<div class="flex gap-2">
						<Select
							type="single"
							bind:value={selectedUserId}
							disabled={addingMember || loadingUsers}
						>
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
						<Button onclick={handleAddMember} disabled={!selectedUserId || addingMember} size="sm">
							{#if addingMember}
								<span class="material-symbols-rounded animate-spin text-lg!">progress_activity</span
								>
							{:else}
								<span class="material-symbols-rounded text-lg!">person_add</span>
							{/if}
						</Button>
					</div>
				</div>

				{#if actionError}
					<div class="text-sm text-destructive mb-4">{actionError}</div>
				{/if}

				<!-- Members list -->
				<div class="space-y-2">
					<span class="text-sm font-medium mb-2 block">
						Miembros actuales ({teamDetail.members.length})
					</span>

					{#if teamDetail.members.length === 0}
						<div class="flex flex-col items-center justify-center py-8 text-muted-foreground">
							<span class="material-symbols-rounded text-3xl! mb-2">group_off</span>
							<p class="text-sm">Este equipo no tiene miembros</p>
						</div>
					{:else}
						<div class="space-y-2 max-h-[300px] overflow-y-auto">
							{#each teamDetail.members as member (member.id)}
								{@const roleBadge = getRoleBadge(member.role)}
								<div
									class="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
								>
									<div class="flex items-center gap-3 min-w-0">
										<div class="flex flex-col min-w-0">
											<span class="font-medium truncate">{member.name}</span>
											<span class="text-sm text-muted-foreground truncate">{member.email}</span>
										</div>
									</div>
									<div class="flex items-center gap-2 shrink-0">
										<Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
										<Button
											variant="ghost"
											size="sm"
											class="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
											onclick={() => handleRemoveMember(member.id)}
											disabled={removingMemberId === member.id}
										>
											{#if removingMemberId === member.id}
												<span class="material-symbols-rounded animate-spin text-lg!"
													>progress_activity</span
												>
											{:else}
												<span class="material-symbols-rounded text-lg!">person_remove</span>
											{/if}
										</Button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</DialogContent>
</Dialog>

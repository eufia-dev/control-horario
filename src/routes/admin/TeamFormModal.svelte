<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import {
		createTeam,
		updateTeam,
		updateMyTeam,
		fetchTeam,
		type Team,
		type TeamDetail,
		type CreateTeamDto,
		type UpdateTeamDto
	} from '$lib/api/teams';
	import { fetchUsers, type User } from '$lib/api/users';
	import type { UserRole } from '$lib/stores/auth';

	type TeamMemberInfo = {
		id: string;
		name: string;
		email: string;
		role: UserRole;
	};

	type Props = {
		open: boolean;
		team?: Team | null;
		/** Pre-populated team members to avoid calling fetchTeam (for team leaders) */
		teamMembers?: TeamMemberInfo[];
		/** If true, uses the /teams/my-team endpoint instead of /teams/:id */
		isMyTeam?: boolean;
		onClose: () => void;
		onSuccess: () => void;
	};

	let {
		open = $bindable(),
		team = null,
		teamMembers = undefined,
		isMyTeam = false,
		onClose,
		onSuccess
	}: Props = $props();

	let name = $state('');
	let selectedLeaderIds = $state<string[]>([]);
	let selectedMemberIds = $state<string[]>([]);
	let leaderSearch = $state('');
	let memberSearch = $state('');
	let users = $state<User[]>([]);
	let teamDetail = $state<TeamDetail | null>(null);
	let loadingUsers = $state(false);
	let loadingTeam = $state(false);
	let submitting = $state(false);
	let success = $state(false);
	let error = $state<string | null>(null);

	const isEditMode = $derived(team !== null && team !== undefined);
	const dialogTitle = $derived(isEditMode ? 'Editar Equipo' : 'Nuevo Equipo');
	const dialogDescription = $derived(
		isEditMode
			? 'Modifica el nombre del equipo, sus jefes y miembros.'
			: 'Crea un nuevo equipo y asigna jefes y miembros.'
	);

	// Users available (not already in a team, or part of the current team being edited)
	const availableUsers = $derived(() => {
		if (isEditMode && teamDetail) {
			// In edit mode: include users with no team OR users that belong to this team
			const teamMemberIds = teamDetail.members.map((m) => m.id);
			const teamLeaderIds = teamDetail.leaders.map((l) => l.id);
			const currentTeamUserIds = new Set([...teamMemberIds, ...teamLeaderIds]);
			return users.filter((user) => user.team === null || currentTeamUserIds.has(user.id));
		}
		// In create mode: only users with no team
		return users.filter((user) => user.team === null);
	});

	// Filter available users for leader selection (include members so they can be promoted to leader, apply search)
	const filteredLeaderOptions = $derived(
		availableUsers().filter((user) => {
			// Apply search filter
			if (leaderSearch.trim()) {
				const search = leaderSearch.toLowerCase();
				return (
					user.name.toLowerCase().includes(search) || user.email.toLowerCase().includes(search)
				);
			}
			return true;
		})
	);

	// Filter available users for member selection (exclude already selected leaders, apply search)
	const filteredMemberOptions = $derived(
		availableUsers().filter((user) => {
			// Don't show users already selected as leaders
			if (selectedLeaderIds.includes(user.id)) return false;
			// Apply search filter
			if (memberSearch.trim()) {
				const search = memberSearch.toLowerCase();
				return (
					user.name.toLowerCase().includes(search) || user.email.toLowerCase().includes(search)
				);
			}
			return true;
		})
	);

	function resetForm() {
		name = '';
		selectedLeaderIds = [];
		selectedMemberIds = [];
		leaderSearch = '';
		memberSearch = '';
		teamDetail = null;
		error = null;
		success = false;
	}

	function populateForm(detail?: TeamDetail) {
		if (team) {
			name = team.name;
			if (detail) {
				teamDetail = detail;
				// Set leaders - those in detail.leaders
				selectedLeaderIds = detail.leaders.map((l) => l.id);
				// Set members - those in detail.members that are NOT leaders
				const leaderIds = new Set(detail.leaders.map((l) => l.id));
				selectedMemberIds = detail.members.filter((m) => !leaderIds.has(m.id)).map((m) => m.id);
			}
		} else {
			resetForm();
		}
	}

	async function loadUsers() {
		loadingUsers = true;
		try {
			users = await fetchUsers();
		} catch (e) {
			console.error('Error loading users:', e);
		} finally {
			loadingUsers = false;
		}
	}

	async function loadTeamDetails() {
		if (!team) return;

		// If teamMembers is provided, use it instead of fetching
		if (teamMembers) {
			const detail: TeamDetail = {
				id: team.id,
				name: team.name,
				memberCount: teamMembers.length,
				leaders: team.leaders,
				createdAt: team.createdAt,
				members: teamMembers.map((m) => ({
					id: m.id,
					name: m.name,
					email: m.email,
					role: m.role
				}))
			};
			populateForm(detail);
			return;
		}

		loadingTeam = true;
		try {
			const detail = await fetchTeam(team.id);
			populateForm(detail);
		} catch (e) {
			console.error('Error loading team details:', e);
			error = 'Error al cargar los detalles del equipo';
		} finally {
			loadingTeam = false;
		}
	}

	$effect(() => {
		if (open) {
			loadUsers();
			if (isEditMode) {
				loadTeamDetails();
			} else {
				populateForm();
			}
		}
	});

	$effect(() => {
		if (!open) {
			resetForm();
		}
	});

	function toggleLeader(userId: string) {
		if (selectedLeaderIds.includes(userId)) {
			selectedLeaderIds = selectedLeaderIds.filter((id) => id !== userId);
		} else {
			selectedLeaderIds = [...selectedLeaderIds, userId];
			// Remove from members if was selected there
			if (selectedMemberIds.includes(userId)) {
				selectedMemberIds = selectedMemberIds.filter((id) => id !== userId);
			}
		}
	}

	function toggleMember(userId: string) {
		if (selectedMemberIds.includes(userId)) {
			selectedMemberIds = selectedMemberIds.filter((id) => id !== userId);
		} else {
			selectedMemberIds = [...selectedMemberIds, userId];
			if (selectedLeaderIds.includes(userId)) {
				selectedLeaderIds = selectedLeaderIds.filter((id) => id !== userId);
			}
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (submitting || success) return;
		error = null;

		if (!name.trim()) {
			error = 'El nombre es obligatorio';
			return;
		}

		submitting = true;

		try {
			if (isEditMode && team) {
				const data: UpdateTeamDto = {
					name: name.trim(),
					leaderIds: selectedLeaderIds,
					memberIds: selectedMemberIds
				};
				if (isMyTeam) {
					await updateMyTeam(data);
				} else {
					await updateTeam(team.id, data);
				}
			} else {
				const data: CreateTeamDto = {
					name: name.trim(),
					leaderIds: selectedLeaderIds.length > 0 ? selectedLeaderIds : undefined,
					memberIds: selectedMemberIds.length > 0 ? selectedMemberIds : undefined
				};
				await createTeam(data);
			}
			submitting = false;
			success = true;
			onSuccess();
			setTimeout(() => {
				open = false;
				onClose();
			}, 800);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al guardar el equipo';
			submitting = false;
		}
	}

	function handleClose() {
		open = false;
		onClose();
	}
</script>

<Dialog bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<DialogContent class="max-h-[90vh] overflow-y-auto">
		<DialogHeader>
			<DialogTitle>{dialogTitle}</DialogTitle>
			<DialogDescription>{dialogDescription}</DialogDescription>
		</DialogHeader>

		<form onsubmit={handleSubmit}>
			<div class="flex flex-col gap-4 py-4">
				<div class="grid gap-2">
					<Label for="name">Nombre del equipo *</Label>
					<Input
						id="name"
						bind:value={name}
						placeholder="Nombre del equipo"
						disabled={submitting}
					/>
				</div>

				<!-- Leaders selection -->
				<div class="flex flex-col gap-2">
					<Label>Jefes del equipo</Label>

					{#if loadingUsers || loadingTeam}
						<Skeleton class="h-40 w-full" />
					{:else}
						<div class="relative">
							<span
								class="material-symbols-rounded absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-lg!"
								>search</span
							>
							<Input
								type="text"
								placeholder="Buscar usuario..."
								bind:value={leaderSearch}
								class="pl-9 h-9"
								disabled={submitting}
							/>
						</div>

						<div class="border rounded-lg overflow-y-auto h-40">
							{#if filteredLeaderOptions.length === 0}
								<div class="px-3 py-4 text-sm text-muted-foreground text-center">
									{leaderSearch ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
								</div>
							{:else}
								{#each filteredLeaderOptions as user (user.id)}
									{@const isSelected = selectedLeaderIds.includes(user.id)}
									<button
										type="button"
										class="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2.5 border-b last:border-b-0 transition-colors {isSelected
											? 'bg-primary/5'
											: ''}"
										onclick={() => toggleLeader(user.id)}
										disabled={submitting}
									>
										<span
											class="material-symbols-rounded text-lg! {isSelected
												? 'text-primary'
												: 'text-muted-foreground'}"
										>
											{isSelected ? 'check_box' : 'check_box_outline_blank'}
										</span>
										<span class="truncate">{user.name}</span>
									</button>
								{/each}
							{/if}
						</div>
					{/if}
					<p class="text-xs text-muted-foreground">
						{selectedLeaderIds.length} Jefe{selectedLeaderIds.length !== 1 ? 's' : ''}
					</p>
				</div>

				<!-- Members selection -->
				<div class="flex flex-col gap-2">
					<Label>Miembros del equipo</Label>

					{#if loadingUsers || loadingTeam}
						<Skeleton class="h-40 w-full" />
					{:else}
						<div class="relative">
							<span
								class="material-symbols-rounded absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-lg!"
								>search</span
							>
							<Input
								type="text"
								placeholder="Buscar usuario..."
								bind:value={memberSearch}
								class="pl-9 h-9"
								disabled={submitting}
							/>
						</div>

						<div class="border rounded-lg overflow-y-auto h-40">
							{#if filteredMemberOptions.length === 0}
								<div class="px-3 py-4 text-sm text-muted-foreground text-center">
									{memberSearch ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
								</div>
							{:else}
								{#each filteredMemberOptions as user (user.id)}
									{@const isSelected = selectedMemberIds.includes(user.id)}
									<button
										type="button"
										class="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2.5 border-b last:border-b-0 transition-colors {isSelected
											? 'bg-primary/5'
											: ''}"
										onclick={() => toggleMember(user.id)}
										disabled={submitting}
									>
										<span
											class="material-symbols-rounded text-lg! {isSelected
												? 'text-primary'
												: 'text-muted-foreground'}"
										>
											{isSelected ? 'check_box' : 'check_box_outline_blank'}
										</span>
										<span class="truncate">{user.name}</span>
									</button>
								{/each}
							{/if}
						</div>
					{/if}
					<p class="text-xs text-muted-foreground">
						{selectedMemberIds.length} miembro{selectedMemberIds.length !== 1 ? 's' : ''}
					</p>
				</div>

				{#if error}
					<div class="text-sm text-destructive">{error}</div>
				{/if}
			</div>

			<DialogFooter>
				<Button
					type="button"
					variant="outline"
					onclick={handleClose}
					disabled={submitting || success}
				>
					Cancelar
				</Button>
				<Button
					type="submit"
					variant={success ? 'success' : 'default'}
					disabled={submitting || success}
					class="min-w-28"
				>
					{#if submitting}
						<span class="material-symbols-rounded animate-spin text-lg!">progress_activity</span>
					{:else if success}
						<span class="material-symbols-rounded text-lg! animate-in zoom-in duration-200"
							>check_circle</span
						>
						Guardado
					{:else}
						{isEditMode ? 'Guardar' : 'Crear equipo'}
					{/if}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

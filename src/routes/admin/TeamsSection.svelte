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
	import TeamFormModal from './TeamFormModal.svelte';
	import TeamDeleteDialog from './TeamDeleteDialog.svelte';
	import TeamMembersDialog from './TeamMembersDialog.svelte';
	import { fetchTeams, type Team } from '$lib/api/teams';
	import { formatDate } from './helpers';

	let teams = $state<Team[]>([]);
	let loadingTeams = $state(true);
	let teamsError = $state<string | null>(null);
	let searchQuery = $state('');

	const filteredTeams = $derived(
		teams.filter((team) => {
			if (!searchQuery.trim()) return true;
			const query = searchQuery.toLowerCase();
			return team.name.toLowerCase().includes(query);
		})
	);

	let teamFormModalOpen = $state(false);
	let teamDeleteDialogOpen = $state(false);
	let teamMembersDialogOpen = $state(false);
	let selectedTeam = $state<Team | null>(null);

	export async function loadTeams() {
		loadingTeams = true;
		teamsError = null;
		try {
			teams = await fetchTeams();
		} catch (e) {
			teamsError = e instanceof Error ? e.message : 'Error desconocido';
		} finally {
			loadingTeams = false;
		}
	}

	onMount(() => {
		loadTeams();
	});

	function handleCreateTeam() {
		selectedTeam = null;
		teamFormModalOpen = true;
	}

	function handleEditTeam(team: Team) {
		selectedTeam = team;
		teamFormModalOpen = true;
	}

	function handleDeleteTeam(team: Team) {
		selectedTeam = team;
		teamDeleteDialogOpen = true;
	}

	function handleManageMembers(team: Team) {
		selectedTeam = team;
		teamMembersDialogOpen = true;
	}

	function handleModalClose() {
		selectedTeam = null;
	}

	function handleSuccess() {
		loadTeams();
	}
</script>

<Card class="w-full max-w-6xl mx-auto">
	<CardHeader class="flex flex-row items-center justify-between space-y-0">
		<CardTitle class="text-2xl font-semibold tracking-tight">Equipos</CardTitle>
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
			<Button onclick={handleCreateTeam}>
				<span class="material-symbols-rounded text-lg!">add</span>
				Crear equipo
			</Button>
		</div>
	</CardHeader>
	<CardContent>
		{#if loadingTeams}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Nombre</TableHead>
						<TableHead>Miembros</TableHead>
						<TableHead>Jefes</TableHead>
						<TableHead>Creado</TableHead>
						<TableHead class="w-[140px]">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each Array.from({ length: 3 }, (_, i) => i) as i (i)}
						<TableRow data-placeholder-index={i}>
							<TableCell><Skeleton class="h-4 w-28" /></TableCell>
							<TableCell><Skeleton class="h-4 w-12" /></TableCell>
							<TableCell><Skeleton class="h-5 w-24 rounded-full" /></TableCell>
							<TableCell><Skeleton class="h-4 w-20" /></TableCell>
							<TableCell><Skeleton class="h-8 w-28" /></TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		{:else if teamsError}
			<div class="flex items-center justify-center py-8 text-destructive">
				<span class="material-symbols-rounded mr-2">error</span>
				{teamsError}
			</div>
		{:else if teams.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
				<span class="material-symbols-rounded text-4xl! mb-2">groups</span>
				<p>No hay equipos disponibles</p>
				<Button variant="outline" class="mt-4" onclick={handleCreateTeam}>
					<span class="material-symbols-rounded mr-2 text-lg!">add</span>
					Crear primer equipo
				</Button>
			</div>
		{:else if filteredTeams.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
				<span class="material-symbols-rounded text-4xl! mb-2">search_off</span>
				<p>No se encontraron equipos</p>
			</div>
		{:else}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Nombre</TableHead>
						<TableHead>Miembros</TableHead>
						<TableHead>Jefes</TableHead>
						<TableHead>Creado</TableHead>
						<TableHead class="w-[140px]">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each filteredTeams as team (team.id)}
						<TableRow>
							<TableCell class="font-medium">
								<Tooltip>
									<TooltipTrigger class="max-w-[200px] truncate">
										{team.name}
									</TooltipTrigger>
									<TooltipContent>
										<p>{team.name}</p>
									</TooltipContent>
								</Tooltip>
							</TableCell>
							<TableCell>
								<Badge variant="secondary">{team.memberCount}</Badge>
							</TableCell>
							<TableCell>
								{#if team.leaders.length === 0}
									<span class="text-muted-foreground">-</span>
								{:else}
									<div class="flex flex-wrap gap-1">
										{#each team.leaders as leader (leader.id)}
											<Badge variant="outline">{leader.name}</Badge>
										{/each}
									</div>
								{/if}
							</TableCell>
							<TableCell class="text-muted-foreground">{formatDate(team.createdAt)}</TableCell>
							<TableCell>
								<div class="flex items-center gap-1">
									<Tooltip>
										<TooltipTrigger>
											<Button
												variant="ghost"
												size="sm"
												class="h-8 w-8 p-0"
												onclick={() => handleManageMembers(team)}
											>
												<span class="material-symbols-rounded text-xl!">group</span>
												<span class="sr-only">Gestionar miembros</span>
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>Gestionar miembros</p>
										</TooltipContent>
									</Tooltip>
									<Tooltip>
										<TooltipTrigger>
											<Button
												variant="ghost"
												size="sm"
												class="h-8 w-8 p-0"
												onclick={() => handleEditTeam(team)}
											>
												<span class="material-symbols-rounded text-xl!">edit</span>
												<span class="sr-only">Editar</span>
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>Editar equipo</p>
										</TooltipContent>
									</Tooltip>
									<Tooltip>
										<TooltipTrigger>
											<Button
												variant="ghost"
												size="sm"
												class="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
												onclick={() => handleDeleteTeam(team)}
											>
												<span class="material-symbols-rounded text-xl!">delete</span>
												<span class="sr-only">Eliminar</span>
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>Eliminar equipo</p>
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

<TeamFormModal
	bind:open={teamFormModalOpen}
	team={selectedTeam}
	onClose={handleModalClose}
	onSuccess={handleSuccess}
/>

<TeamDeleteDialog
	bind:open={teamDeleteDialogOpen}
	team={selectedTeam}
	onClose={handleModalClose}
	onSuccess={handleSuccess}
/>

<TeamMembersDialog
	bind:open={teamMembersDialogOpen}
	team={selectedTeam}
	onClose={handleModalClose}
	onSuccess={handleSuccess}
/>

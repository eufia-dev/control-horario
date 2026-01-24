<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Combobox } from '$lib/components/ui/combobox';
	import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';
	import ScheduleEditor from '../ScheduleEditor.svelte';
	import {
		fetchCompanyDefaultSchedule,
		fetchUserSchedule,
		updateUserOverrides,
		deleteUserOverrides,
		validateSchedule,
		type WorkScheduleDay
	} from '$lib/api/work-schedules';
	import { fetchUsers, type User } from '$lib/api/users';
	import { userTeamId as userTeamIdStore } from '$lib/stores/auth';

	let activeTab = $state<'company' | 'users'>('users');

	let currentUserTeamId = $state<string | null>(null);

	$effect(() => {
		const unsub = userTeamIdStore.subscribe((value) => {
			currentUserTeamId = value;
		});
		return unsub;
	});

	let companySchedule = $state<WorkScheduleDay[]>([]);
	let loadingCompanySchedule = $state(true);
	let companyScheduleError = $state<string | null>(null);

	let users = $state<User[]>([]);
	let loadingUsers = $state(true);

	let selectedUserId = $state<string | undefined>(undefined);
	let userSchedule = $state<WorkScheduleDay[]>([]);
	let loadingUserSchedule = $state(false);
	let savingUserSchedule = $state(false);
	let deletingUserOverrides = $state(false);
	let userScheduleError = $state<string | null>(null);

	// Filter to only show team members (active users in the team leader's team)
	const teamMembers = $derived(users.filter((u) => u.isActive && u.team?.id === currentUserTeamId));

	async function loadCompanySchedule() {
		loadingCompanySchedule = true;
		companyScheduleError = null;
		try {
			const response = await fetchCompanyDefaultSchedule();
			companySchedule = response.days;
		} catch (e) {
			companyScheduleError = e instanceof Error ? e.message : 'Error al cargar el horario';
		} finally {
			loadingCompanySchedule = false;
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

	async function loadUserSchedule(userId: string) {
		loadingUserSchedule = true;
		userScheduleError = null;
		try {
			const response = await fetchUserSchedule(userId);
			userSchedule = response.days;
		} catch (e) {
			userScheduleError = e instanceof Error ? e.message : 'Error al cargar el horario';
		} finally {
			loadingUserSchedule = false;
		}
	}

	async function handleSaveUserSchedule() {
		if (!selectedUserId) return;

		const validation = validateSchedule({ days: userSchedule });
		if (!validation.valid) {
			userScheduleError = validation.error;
			return;
		}

		savingUserSchedule = true;
		userScheduleError = null;
		try {
			const response = await updateUserOverrides(selectedUserId, { days: userSchedule });
			userSchedule = response.days;
		} catch (e) {
			userScheduleError = e instanceof Error ? e.message : 'Error al guardar el horario';
		} finally {
			savingUserSchedule = false;
		}
	}

	async function handleResetUserSchedule() {
		if (!selectedUserId) return;

		deletingUserOverrides = true;
		userScheduleError = null;
		try {
			await deleteUserOverrides(selectedUserId);
			// Reload to get the effective schedule (which will now be company defaults)
			await loadUserSchedule(selectedUserId);
		} catch (e) {
			userScheduleError = e instanceof Error ? e.message : 'Error al restablecer el horario';
		} finally {
			deletingUserOverrides = false;
		}
	}

	// Load user schedule when selection changes
	$effect(() => {
		if (selectedUserId) {
			loadUserSchedule(selectedUserId);
		}
	});

	onMount(() => {
		loadCompanySchedule();
		loadUsers();
	});
</script>

<Card class="w-full max-w-6xl mx-auto">
	<CardHeader class="flex flex-row items-center justify-between space-y-0 flex-wrap gap-4">
		<CardTitle class="text-2xl font-semibold tracking-tight flex items-center gap-2">
			<span class="material-symbols-rounded text-2xl!">schedule</span>
			Horarios de Trabajo
		</CardTitle>
	</CardHeader>
	<CardContent>
		<Tabs bind:value={activeTab} class="w-full">
			<div class="mb-4 overflow-x-auto">
				<TabsList class="w-fit">
					<TabsTrigger value="company">
						<span class="material-symbols-rounded mr-1 text-lg!">business</span>
						Horario por defecto
					</TabsTrigger>
					<TabsTrigger value="users">
						<span class="material-symbols-rounded mr-1 text-lg!">person</span>
						Horarios de mi equipo
					</TabsTrigger>
				</TabsList>
			</div>

			<TabsContent value="company">
				{#if loadingCompanySchedule}
					<div class="space-y-3">
						{#each Array.from({ length: 7 }, (_, i) => i) as i (i)}
							<Skeleton class="h-14 w-full" />
						{/each}
					</div>
				{:else if companyScheduleError && companySchedule.length === 0}
					<div class="flex flex-col items-center justify-center py-8 text-destructive">
						<span class="material-symbols-rounded text-4xl! mb-2">error</span>
						<p>{companyScheduleError}</p>
						<Button variant="outline" class="mt-4" onclick={loadCompanySchedule}>
							<span class="material-symbols-rounded text-lg! mr-2">refresh</span>
							Reintentar
						</Button>
					</div>
				{:else}
					<div class="space-y-4">
						<p class="text-sm text-muted-foreground">
							Este es el horario de trabajo por defecto de la empresa. Solo los administradores
							pueden modificarlo.
						</p>

						<ScheduleEditor bind:schedule={companySchedule} readonly={true} />
					</div>
				{/if}
			</TabsContent>

			<TabsContent value="users">
				<div class="space-y-4">
					<p class="text-sm text-muted-foreground">
						Configura horarios personalizados para los miembros de tu equipo. Estos horarios
						sobrescriben el horario por defecto de la empresa.
					</p>

					<div class="flex items-center gap-4">
						<Combobox
							items={teamMembers}
							bind:value={selectedUserId}
							getItemValue={(user) => user.id}
							getItemLabel={(user) => user.name}
							placeholder="Seleccionar miembro del equipo"
							searchPlaceholder="Buscar miembro..."
							emptyMessage="No se encontraron miembros en tu equipo."
							disabled={loadingUsers || loadingUserSchedule}
							class="w-full max-w-xs"
						/>
					</div>

					{#if selectedUserId}
						{#if loadingUserSchedule}
							<div class="space-y-3">
								{#each Array.from({ length: 7 }, (_, i) => i) as i (i)}
									<Skeleton class="h-14 w-full" />
								{/each}
							</div>
						{:else if userScheduleError && userSchedule.length === 0}
							<div class="flex flex-col items-center justify-center py-8 text-destructive">
								<span class="material-symbols-rounded text-4xl! mb-2">error</span>
								<p>{userScheduleError}</p>
								<Button
									variant="outline"
									class="mt-4"
									onclick={() => selectedUserId && loadUserSchedule(selectedUserId)}
								>
									<span class="material-symbols-rounded text-lg! mr-2">refresh</span>
									Reintentar
								</Button>
							</div>
						{:else}
							<ScheduleEditor
								bind:schedule={userSchedule}
								disabled={savingUserSchedule || deletingUserOverrides}
							/>

							{#if userScheduleError}
								<div class="text-sm text-destructive flex items-center gap-1">
									<span class="material-symbols-rounded text-base">error</span>
									{userScheduleError}
								</div>
							{/if}

							<div class="flex justify-between">
								<Tooltip>
									<TooltipTrigger>
										<Button
											variant="outline"
											onclick={handleResetUserSchedule}
											disabled={savingUserSchedule || deletingUserOverrides}
										>
											{#if deletingUserOverrides}
												<span class="material-symbols-rounded animate-spin text-lg!"
													>progress_activity</span
												>
											{:else}
												<span class="material-symbols-rounded text-lg! mr-2">restart_alt</span>
											{/if}
											Restablecer a valores por defecto
										</Button>
									</TooltipTrigger>
									<TooltipContent>
										<p>Elimina las personalizaciones y usa el horario de empresa</p>
									</TooltipContent>
								</Tooltip>

								<Button
									onclick={handleSaveUserSchedule}
									disabled={savingUserSchedule || deletingUserOverrides}
								>
									{#if savingUserSchedule}
										<span class="material-symbols-rounded animate-spin text-lg!"
											>progress_activity</span
										>
									{:else}
										<span class="material-symbols-rounded text-lg! mr-2">save</span>
									{/if}
									Guardar cambios
								</Button>
							</div>
						{/if}
					{:else}
						<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
							<span class="material-symbols-rounded text-4xl! mb-2">person_search</span>
							<p>Selecciona un miembro de tu equipo para ver y editar su horario</p>
						</div>
					{/if}
				</div>
			</TabsContent>
		</Tabs>
	</CardContent>
</Card>

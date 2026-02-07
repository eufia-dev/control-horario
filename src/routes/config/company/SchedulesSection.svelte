<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import { Combobox } from '$lib/components/ui/combobox';
	import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';
	import ScheduleEditor from '../ScheduleEditor.svelte';
	import {
		fetchCompanyDefaultSchedule,
		fetchUserSchedule,
		updateCompanyDefaultSchedule,
		updateUserOverrides,
		deleteUserOverrides,
		validateSchedule,
		type WorkScheduleDay
	} from '$lib/api/work-schedules';
	import { fetchMyCompany, updateCompanySettings, type Company } from '$lib/api/companies';
	import { fetchUsers, type User } from '$lib/api/users';

	let activeTab = $state<'company' | 'users'>('company');

	let company = $state<Company | null>(null);
	let loadingCompany = $state(true);
	let savingSettings = $state(false);

	let companySchedule = $state<WorkScheduleDay[]>([]);
	let loadingCompanySchedule = $state(true);
	let savingCompanySchedule = $state(false);
	let companyScheduleError = $state<string | null>(null);

	let users = $state<User[]>([]);
	let loadingUsers = $state(true);

	let selectedUserId = $state<string | undefined>(undefined);
	let userSchedule = $state<WorkScheduleDay[]>([]);
	let loadingUserSchedule = $state(false);
	let savingUserSchedule = $state(false);
	let deletingUserOverrides = $state(false);
	let userScheduleError = $state<string | null>(null);

	const activeUsers = $derived(users.filter((u) => u.isActive));

	async function loadCompany() {
		loadingCompany = true;
		try {
			company = await fetchMyCompany();
		} catch (e) {
			console.error('Error loading company:', e);
		} finally {
			loadingCompany = false;
		}
	}

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

	async function handleToggleAllowUserEdit(checked: boolean) {
		if (!company) return;
		savingSettings = true;
		try {
			company = await updateCompanySettings({ allowUserEditSchedule: checked });
		} catch (e) {
			console.error('Error updating company settings:', e);
		} finally {
			savingSettings = false;
		}
	}

	async function handleSaveCompanySchedule() {
		const validation = validateSchedule({ days: companySchedule });
		if (!validation.valid) {
			companyScheduleError = validation.error;
			return;
		}

		savingCompanySchedule = true;
		companyScheduleError = null;
		try {
			const response = await updateCompanyDefaultSchedule({ days: companySchedule });
			companySchedule = response.days;
		} catch (e) {
			companyScheduleError = e instanceof Error ? e.message : 'Error al guardar el horario';
		} finally {
			savingCompanySchedule = false;
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
		loadCompany();
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
		{#if !loadingCompany && company}
			<Tooltip>
				<TooltipTrigger>
					<div class="flex items-center gap-2">
						<Switch
							id="allowUserEdit"
							checked={company.allowUserEditSchedule}
							onCheckedChange={handleToggleAllowUserEdit}
							disabled={savingSettings}
						/>
						<Label for="allowUserEdit" class="cursor-pointer text-sm">
							Permitir a empleados personalizar horario
						</Label>
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<p>Si está activado, los empleados pueden definir su propio horario</p>
				</TooltipContent>
			</Tooltip>
		{/if}
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
						Horarios de usuarios
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
							Define el horario de trabajo por defecto para todos los empleados de la empresa. Los
							días no habilitados se consideran no laborables.
						</p>

						<ScheduleEditor bind:schedule={companySchedule} disabled={savingCompanySchedule} />

						{#if companyScheduleError}
							<div class="text-sm text-destructive flex items-center gap-1">
								<span class="material-symbols-rounded text-base">error</span>
								{companyScheduleError}
							</div>
						{/if}

						<div class="flex justify-end">
							<Button onclick={handleSaveCompanySchedule} disabled={savingCompanySchedule}>
								{#if savingCompanySchedule}
									<span class="material-symbols-rounded animate-spin text-lg!"
										>progress_activity</span
									>
								{:else}
									<span class="material-symbols-rounded text-lg! mr-2">save</span>
								{/if}
								Guardar cambios
							</Button>
						</div>
					</div>
				{/if}
			</TabsContent>

			<TabsContent value="users">
				<div class="space-y-4">
					<p class="text-sm text-muted-foreground">
						Configura horarios personalizados para usuarios específicos. Estos horarios sobrescriben
						el horario por defecto de la empresa.
					</p>

					<div class="flex items-center gap-4">
						<Combobox
							items={activeUsers}
							bind:value={selectedUserId}
							getItemValue={(user) => user.id}
							getItemLabel={(user) => user.name}
							placeholder="Seleccionar usuario"
							searchPlaceholder="Buscar usuario"
							emptyMessage="No se encontraron usuarios."
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
							<p>Selecciona un usuario para ver y editar su horario</p>
						</div>
					{/if}
				</div>
			</TabsContent>
		</Tabs>
	</CardContent>
</Card>

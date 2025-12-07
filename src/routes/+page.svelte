<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import {
		Table,
		TableHeader,
		TableBody,
		TableRow,
		TableHead,
		TableCell
	} from '$lib/components/ui/table';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import {
		Tooltip,
		TooltipContent,
		TooltipProvider,
		TooltipTrigger
	} from '$lib/components/ui/tooltip';
	import TimeEntryFormModal from '$lib/components/time-entry-form-modal.svelte';
	import TimeEntryDeleteDialog from '$lib/components/time-entry-delete-dialog.svelte';
	import ExternalHoursFormModal from '$lib/components/external-hours-form-modal.svelte';
	import ExternalHoursDeleteDialog from '$lib/components/external-hours-delete-dialog.svelte';
	import { fetchProjects, type Project } from '$lib/api/projects';
	import {
		fetchMyTimeEntries,
		fetchTimeEntryTypes,
		getActiveTimer,
		startTimer,
		stopTimer,
		switchTimer,
		type TimeEntry,
		type ActiveTimer,
		type TimeEntryType
	} from '$lib/api/time-entries';
	import {
		fetchExternals,
		fetchAllExternalHours,
		type External,
		type ExternalHours
	} from '$lib/api/externals';
	import { auth, isAdmin as isAdminStore } from '$lib/stores/auth';

	// Auth state
	let isAdmin = $state(false);
	$effect(() => {
		const unsub = isAdminStore.subscribe((value) => {
			isAdmin = value;
		});
		return unsub;
	});

	// Data state
	let projects = $state<Project[]>([]);
	let timeEntryTypes = $state<TimeEntryType[]>([]);
	let timeEntries = $state<TimeEntry[]>([]);
	let activeTimer = $state<ActiveTimer | null>(null);

	// External data state (admin only)
	let externals = $state<External[]>([]);
	let externalHours = $state<ExternalHours[]>([]);

	// Loading states
	let loadingProjects = $state(true);
	let loadingTypes = $state(true);
	let loadingEntries = $state(true);
	let loadingTimer = $state(true);
	let loadingExternals = $state(true);
	let loadingExternalHours = $state(true);

	// Error states
	let entriesError = $state<string | null>(null);
	let externalHoursError = $state<string | null>(null);

	// Timer form state (for starting new timer)
	let selectedProjectId = $state<string | undefined>(undefined);
	let selectedTypeId = $state<string | undefined>(undefined);
	let isOffice = $state(true);
	let startingTimer = $state(false);
	let stoppingTimer = $state(false);

	// Switch task state
	let showSwitchForm = $state(false);
	let switchProjectId = $state<string | undefined>(undefined);
	let switchTypeId = $state<string | undefined>(undefined);
	let switchIsOffice = $state(true);
	let switchingTimer = $state(false);

	// Modal state for time entries
	let formModalOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let selectedEntry = $state<TimeEntry | null>(null);

	// Modal state for external hours
	let externalHoursFormOpen = $state(false);
	let externalHoursDeleteOpen = $state(false);
	let selectedExternalHours = $state<ExternalHours | null>(null);

	// Tabs state
	let activeTab = $state('my-entries');

	// Elapsed time state
	let elapsedSeconds = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	// Derived values
	const selectedProject = $derived(projects.find((p) => p.id === selectedProjectId));
	const selectedType = $derived(timeEntryTypes.find((t) => t.id === selectedTypeId));
	const switchProject = $derived(projects.find((p) => p.id === switchProjectId));
	const switchType = $derived(timeEntryTypes.find((t) => t.id === switchTypeId));
	const activeProjects = $derived(projects.filter((p) => p.isActive));

	const canStartTimer = $derived(
		selectedProjectId && selectedTypeId && !startingTimer && !activeTimer
	);

	// Enrich external hours with project info
	const enrichedExternalHours = $derived(
		externalHours.map((h) => ({
			...h,
			project: projects.find((p) => p.id === h.projectId)
		}))
	);

	async function loadProjects() {
		loadingProjects = true;
		try {
			projects = await fetchProjects();
			// Auto-select first active project if none selected
			if (!selectedProjectId && activeProjects.length > 0) {
				selectedProjectId = activeProjects[0].id;
			}
		} catch (e) {
			console.error('Error loading projects:', e);
		} finally {
			loadingProjects = false;
		}
	}

	async function loadTypes() {
		loadingTypes = true;
		try {
			timeEntryTypes = await fetchTimeEntryTypes();

			const trabajoType = timeEntryTypes.find((t) => t.name === 'Trabajo');
			if (!selectedTypeId) {
				if (trabajoType) {
					selectedTypeId = trabajoType.id;
				} else if (timeEntryTypes.length > 0) {
					selectedTypeId = timeEntryTypes[0].id;
				}
			}
		} catch (e) {
			console.error('Error loading time entry types:', e);
		} finally {
			loadingTypes = false;
		}
	}

	async function loadEntries() {
		loadingEntries = true;
		entriesError = null;
		try {
			timeEntries = await fetchMyTimeEntries();
		} catch (e) {
			entriesError = e instanceof Error ? e.message : 'Error desconocido';
		} finally {
			loadingEntries = false;
		}
	}

	async function loadActiveTimer() {
		loadingTimer = true;
		try {
			activeTimer = await getActiveTimer();
			if (activeTimer) {
				startElapsedTimer();
			}
		} catch (e) {
			console.error('Error loading active timer:', e);
		} finally {
			loadingTimer = false;
		}
	}

	async function loadExternals() {
		if (!isAdmin) return;
		loadingExternals = true;
		try {
			externals = await fetchExternals();
		} catch (e) {
			console.error('Error loading externals:', e);
		} finally {
			loadingExternals = false;
		}
	}

	async function loadExternalHours() {
		if (!isAdmin) return;
		loadingExternalHours = true;
		externalHoursError = null;
		try {
			externalHours = await fetchAllExternalHours();
		} catch (e) {
			externalHoursError = e instanceof Error ? e.message : 'Error desconocido';
		} finally {
			loadingExternalHours = false;
		}
	}

	function startElapsedTimer() {
		if (timerInterval) {
			clearInterval(timerInterval);
		}
		if (activeTimer) {
			const startTime = new Date(activeTimer.startedAt).getTime();
			elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
			timerInterval = setInterval(() => {
				if (activeTimer) {
					const startTime = new Date(activeTimer.startedAt).getTime();
					elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
				}
			}, 1000);
		}
	}

	function stopElapsedTimer() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
		elapsedSeconds = 0;
	}

	function formatElapsedTime(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}

	function formatDuration(minutes: number): string {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 0) {
			return `${hours}h ${mins}m`;
		}
		return `${mins}m`;
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('es-ES', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function formatTime(dateString: string): string {
		return new Date(dateString).toLocaleTimeString('es-ES', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function handleStartTimer() {
		if (!selectedProjectId || !selectedTypeId) return;

		startingTimer = true;
		try {
			activeTimer = await startTimer({
				projectId: selectedProjectId,
				typeId: selectedTypeId,
				isOffice
			});
			startElapsedTimer();
		} catch (e) {
			console.error('Error starting timer:', e);
		} finally {
			startingTimer = false;
		}
	}

	async function handleStopTimer() {
		stoppingTimer = true;
		try {
			await stopTimer();
			activeTimer = null;
			stopElapsedTimer();
			await loadEntries();
		} catch (e) {
			console.error('Error stopping timer:', e);
		} finally {
			stoppingTimer = false;
		}
	}

	function handleShowSwitchForm() {
		// Pre-populate with current timer's type and office setting
		if (activeTimer) {
			switchTypeId = activeTimer.typeId;
			switchIsOffice = activeTimer.isOffice;
		}
		switchProjectId = undefined;
		showSwitchForm = true;
	}

	function handleCancelSwitch() {
		showSwitchForm = false;
		switchProjectId = undefined;
		switchTypeId = undefined;
	}

	async function handleSwitchTimer() {
		if (!switchProjectId || !switchTypeId) return;

		switchingTimer = true;
		try {
			const result = await switchTimer({
				projectId: switchProjectId,
				typeId: switchTypeId,
				isOffice: switchIsOffice
			});
			activeTimer = result.activeTimer;
			startElapsedTimer();
			showSwitchForm = false;
			await loadEntries();
		} catch (e) {
			console.error('Error switching timer:', e);
		} finally {
			switchingTimer = false;
		}
	}

	// Entry handlers
	function handleCreateEntry() {
		selectedEntry = null;
		formModalOpen = true;
	}

	function handleEditEntry(entry: TimeEntry) {
		selectedEntry = entry;
		formModalOpen = true;
	}

	function handleDeleteEntry(entry: TimeEntry) {
		selectedEntry = entry;
		deleteDialogOpen = true;
	}

	function handleModalClose() {
		selectedEntry = null;
	}

	function handleEntrySuccess() {
		loadEntries();
	}

	// External hours handlers
	function handleCreateExternalHours() {
		selectedExternalHours = null;
		externalHoursFormOpen = true;
	}

	function handleEditExternalHours(entry: ExternalHours) {
		selectedExternalHours = entry;
		externalHoursFormOpen = true;
	}

	function handleDeleteExternalHours(entry: ExternalHours) {
		selectedExternalHours = entry;
		externalHoursDeleteOpen = true;
	}

	function handleExternalHoursModalClose() {
		selectedExternalHours = null;
	}

	function handleExternalHoursSuccess() {
		loadExternalHours();
	}

	onMount(() => {
		loadProjects();
		loadTypes();
		loadEntries();
		loadActiveTimer();
		// Load admin-only data
		loadExternals();
		loadExternalHours();
	});

	onDestroy(() => {
		stopElapsedTimer();
	});
</script>

<div class="grow flex flex-col gap-6 p-6">
	<!-- Active Timer Card -->
	<Card class="w-full max-w-5xl mx-auto">
		<CardHeader>
			<CardTitle class="text-2xl font-semibold tracking-tight flex items-center gap-2">
				<span class="material-symbols-rounded text-3xl!">timer</span>
				Temporizador
			</CardTitle>
		</CardHeader>
		<CardContent>
			{#if loadingTimer || loadingProjects || loadingTypes}
				<div class="flex flex-col gap-4">
					<Skeleton class="h-10 w-full" />
					<div class="flex gap-4">
						<Skeleton class="h-10 w-48" />
						<Skeleton class="h-10 w-32" />
					</div>
				</div>
			{:else if activeTimer}
				<!-- Timer Running State -->
				<div class="flex flex-col gap-6">
					<div class="flex items-center justify-between flex-wrap gap-4">
						<div class="flex flex-col gap-1">
							<div class="flex items-center gap-2">
								<span class="relative flex h-3 w-3">
									<span
										class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success"
									></span>
									<span class="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
								</span>
								<span class="text-sm font-medium text-success">En curso</span>
							</div>
							<div class="text-4xl font-mono font-bold tracking-tight">
								{formatElapsedTime(elapsedSeconds)}
							</div>
						</div>
						<div class="flex flex-col gap-1 text-right">
							<div class="text-lg font-semibold">{activeTimer.project?.name ?? 'Proyecto'}</div>
							<div class="flex items-center gap-2 justify-end">
								<Badge variant="secondary">{activeTimer.timeEntryType?.name ?? 'Tipo'}</Badge>
								<Badge variant={activeTimer.isOffice ? 'default' : 'outline'}>
									{activeTimer.isOffice ? 'Oficina' : 'Remoto'}
								</Badge>
							</div>
						</div>
					</div>

					{#if showSwitchForm}
						<!-- Switch Task Form -->
						<div class="border rounded-lg p-4 bg-muted/30 space-y-4">
							<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
								<span class="material-symbols-rounded text-lg!">swap_horiz</span>
								Cambiar a otra tarea
							</div>
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div class="grid gap-2">
									<Label>Proyecto</Label>
									<Select type="single" bind:value={switchProjectId} disabled={switchingTimer}>
										<SelectTrigger class="w-full">
											{#if switchProject}
												{switchProject.name}
											{:else}
												<span class="text-muted-foreground">Seleccionar proyecto</span>
											{/if}
										</SelectTrigger>
										<SelectContent>
											{#each activeProjects as project (project.id)}
												<SelectItem value={project.id} label={project.name} />
											{/each}
										</SelectContent>
									</Select>
								</div>
								<div class="grid gap-2">
									<Label>Tipo</Label>
									<Select type="single" bind:value={switchTypeId} disabled={switchingTimer}>
										<SelectTrigger class="w-full">
											{#if switchType}
												{switchType.name}
											{:else}
												<span class="text-muted-foreground">Seleccionar tipo</span>
											{/if}
										</SelectTrigger>
										<SelectContent>
											{#each timeEntryTypes as type (type.id)}
												<SelectItem value={type.id} label={type.name} />
											{/each}
										</SelectContent>
									</Select>
								</div>
							</div>
							<div class="flex items-center gap-3">
								<Switch
									id="switchIsOffice"
									bind:checked={switchIsOffice}
									disabled={switchingTimer}
								/>
								<Label for="switchIsOffice" class="cursor-pointer">
									{switchIsOffice ? 'Oficina' : 'Remoto'}
								</Label>
							</div>
							<div class="flex gap-2 justify-end">
								<Button variant="outline" onclick={handleCancelSwitch} disabled={switchingTimer}>
									Cancelar
								</Button>
								<Button
									onclick={handleSwitchTimer}
									disabled={!switchProjectId || !switchTypeId || switchingTimer}
								>
									{#if switchingTimer}
										<span class="material-symbols-rounded animate-spin text-base"
											>progress_activity</span
										>
									{/if}
									Cambiar tarea
								</Button>
							</div>
						</div>
					{:else}
						<!-- Timer Actions -->
						<div class="flex gap-3 flex-wrap">
							<Button
								variant="destructive"
								onclick={handleStopTimer}
								disabled={stoppingTimer}
								class="flex-1 sm:flex-none"
							>
								{#if stoppingTimer}
									<span class="material-symbols-rounded mr-2 animate-spin text-base"
										>progress_activity</span
									>
								{:else}
									<span class="material-symbols-rounded mr-2 text-lg!">stop</span>
								{/if}
								Detener
							</Button>
							<Button
								variant="outline"
								onclick={handleShowSwitchForm}
								disabled={stoppingTimer}
								class="flex-1 sm:flex-none"
							>
								<span class="material-symbols-rounded mr-2 text-lg!">swap_horiz</span>
								Cambiar tarea
							</Button>
						</div>
					{/if}
				</div>
			{:else}
				<!-- Start Timer Form -->
				<div class="flex flex-col gap-4">
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div class="grid gap-2">
							<Label>Proyecto</Label>
							<Select type="single" bind:value={selectedProjectId} disabled={startingTimer}>
								<SelectTrigger class="w-full">
									{#if selectedProject}
										{selectedProject.name}
									{:else}
										<span class="text-muted-foreground">Seleccionar proyecto</span>
									{/if}
								</SelectTrigger>
								<SelectContent>
									{#each activeProjects as project (project.id)}
										<SelectItem value={project.id} label={project.name} />
									{/each}
								</SelectContent>
							</Select>
						</div>
						<div class="grid gap-2">
							<Label>Tipo</Label>
							<Select type="single" bind:value={selectedTypeId} disabled={startingTimer}>
								<SelectTrigger class="w-full">
									{#if selectedType}
										{selectedType.name}
									{:else}
										<span class="text-muted-foreground">Seleccionar tipo</span>
									{/if}
								</SelectTrigger>
								<SelectContent>
									{#each timeEntryTypes as type (type.id)}
										<SelectItem value={type.id} label={type.name} />
									{/each}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div class="flex items-center justify-between flex-wrap gap-4">
						<div class="flex items-center gap-3">
							<Switch id="isOffice" bind:checked={isOffice} disabled={startingTimer} />
							<Label for="isOffice" class="cursor-pointer">
								{isOffice ? 'Oficina' : 'Remoto'}
							</Label>
						</div>
						<Button onclick={handleStartTimer} disabled={!canStartTimer}>
							{#if startingTimer}
								<span class="material-symbols-rounded animate-spin text-base"
									>progress_activity</span
								>
							{:else}
								<span class="material-symbols-rounded text-lg!">play_arrow</span>
							{/if}
							Iniciar temporizador
						</Button>
					</div>
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Time Entries / External Hours Card -->
	<Card class="w-full max-w-5xl mx-auto">
		<CardHeader class="flex flex-row items-center justify-between space-y-0">
			<CardTitle class="text-2xl font-semibold tracking-tight">Historial</CardTitle>
			{#if isAdmin}
				{#if activeTab === 'my-entries'}
					<Button onclick={handleCreateEntry}>
						<span class="material-symbols-rounded text-lg!">add</span>
						Añadir
					</Button>
				{:else}
					<Button onclick={handleCreateExternalHours}>
						<span class="material-symbols-rounded text-lg!">add</span>
						Añadir externas
					</Button>
				{/if}
			{:else}
				<Button onclick={handleCreateEntry}>
					<span class="material-symbols-rounded text-lg!">add</span>
					Añadir
				</Button>
			{/if}
		</CardHeader>
		<CardContent>
			{#if isAdmin}
				<Tabs bind:value={activeTab} class="w-full">
					<TabsList class="mb-4">
						<TabsTrigger value="my-entries">
							<span class="material-symbols-rounded mr-2 text-lg!">person</span>
							Mis Registros
						</TabsTrigger>
						<TabsTrigger value="external-hours">
							<span class="material-symbols-rounded mr-2 text-lg!">group</span>
							Externos
						</TabsTrigger>
					</TabsList>

					<TabsContent value="my-entries">
						{#if loadingEntries}
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Fecha</TableHead>
										<TableHead>Proyecto</TableHead>
										<TableHead>Tipo</TableHead>
										<TableHead>Inicio</TableHead>
										<TableHead>Fin</TableHead>
										<TableHead>Duración</TableHead>
										<TableHead>Lugar</TableHead>
										<TableHead class="w-[100px]">Acciones</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{#each Array(5) as _}
										<TableRow>
											<TableCell><Skeleton class="h-4 w-20" /></TableCell>
											<TableCell><Skeleton class="h-4 w-32" /></TableCell>
											<TableCell><Skeleton class="h-4 w-20" /></TableCell>
											<TableCell><Skeleton class="h-4 w-14" /></TableCell>
											<TableCell><Skeleton class="h-4 w-14" /></TableCell>
											<TableCell><Skeleton class="h-4 w-16" /></TableCell>
											<TableCell><Skeleton class="h-5 w-16 rounded-full" /></TableCell>
											<TableCell><Skeleton class="h-8 w-20" /></TableCell>
										</TableRow>
									{/each}
								</TableBody>
							</Table>
						{:else if entriesError}
							<div class="flex items-center justify-center py-8 text-destructive">
								<span class="material-symbols-rounded mr-2">error</span>
								{entriesError}
							</div>
						{:else if timeEntries.length === 0}
							<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
								<span class="material-symbols-rounded text-4xl! mb-2">history</span>
								<p>No hay registros de tiempo</p>
								<Button variant="outline" class="mt-4" onclick={handleCreateEntry}>
									<span class="material-symbols-rounded mr-2 text-lg!">add</span>
									Crear primer registro
								</Button>
							</div>
						{:else}
							<TooltipProvider>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Fecha</TableHead>
											<TableHead>Proyecto</TableHead>
											<TableHead>Tipo</TableHead>
											<TableHead>Inicio</TableHead>
											<TableHead>Fin</TableHead>
											<TableHead>Duración</TableHead>
											<TableHead>Lugar</TableHead>
											<TableHead class="w-[100px]">Acciones</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{#each timeEntries as entry (entry.id)}
											<TableRow>
												<TableCell class="font-medium">
													{formatDate(entry.startedAt)}
												</TableCell>
												<TableCell>
													<Tooltip>
														<TooltipTrigger class="max-w-[150px] truncate">
															{entry.project?.name ?? '-'}
														</TooltipTrigger>
														<TooltipContent>
															<p>{entry.project?.name ?? '-'}</p>
														</TooltipContent>
													</Tooltip>
												</TableCell>
												<TableCell>
													<Badge variant="secondary">{entry.timeEntryType?.name ?? '-'}</Badge>
												</TableCell>
												<TableCell class="text-muted-foreground">
													{formatTime(entry.startedAt)}
												</TableCell>
												<TableCell class="text-muted-foreground">
													{formatTime(entry.endedAt)}
												</TableCell>
												<TableCell class="font-medium">
													{formatDuration(entry.minutes)}
												</TableCell>
												<TableCell>
													<Badge variant={entry.isOffice ? 'default' : 'outline'}>
														{entry.isOffice ? 'Oficina' : 'Remoto'}
													</Badge>
												</TableCell>
												<TableCell>
													<div class="flex items-center gap-1">
														<Button
															variant="ghost"
															size="sm"
															class="h-8 w-8 p-0"
															onclick={() => handleEditEntry(entry)}
														>
															<span class="material-symbols-rounded text-xl!">edit</span>
															<span class="sr-only">Editar</span>
														</Button>
														<Button
															variant="ghost"
															size="sm"
															class="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
															onclick={() => handleDeleteEntry(entry)}
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
					</TabsContent>

					<TabsContent value="external-hours">
						{#if loadingExternalHours || loadingExternals}
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Fecha</TableHead>
										<TableHead>Externo</TableHead>
										<TableHead>Proyecto</TableHead>
										<TableHead>Duración</TableHead>
										<TableHead class="w-[100px]">Acciones</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{#each Array(5) as _}
										<TableRow>
											<TableCell><Skeleton class="h-4 w-20" /></TableCell>
											<TableCell><Skeleton class="h-4 w-32" /></TableCell>
											<TableCell><Skeleton class="h-4 w-32" /></TableCell>
											<TableCell><Skeleton class="h-4 w-16" /></TableCell>
											<TableCell><Skeleton class="h-8 w-20" /></TableCell>
										</TableRow>
									{/each}
								</TableBody>
							</Table>
						{:else if externalHoursError}
							<div class="flex items-center justify-center py-8 text-destructive">
								<span class="material-symbols-rounded mr-2">error</span>
								{externalHoursError}
							</div>
						{:else if enrichedExternalHours.length === 0}
							<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
								<span class="material-symbols-rounded text-4xl! mb-2">group</span>
								<p>No hay horas de externos registradas</p>
								<Button variant="outline" class="mt-4" onclick={handleCreateExternalHours}>
									<span class="material-symbols-rounded mr-2 text-lg!">add</span>
									Registrar primeras horas
								</Button>
							</div>
						{:else}
							<TooltipProvider>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Fecha</TableHead>
											<TableHead>Externo</TableHead>
											<TableHead>Proyecto</TableHead>
											<TableHead>Duración</TableHead>
											<TableHead class="w-[100px]">Acciones</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{#each enrichedExternalHours as entry (entry.id)}
											<TableRow>
												<TableCell class="font-medium">
													{formatDate(entry.date)}
												</TableCell>
												<TableCell>
													<Tooltip>
														<TooltipTrigger class="max-w-[150px] truncate">
															{entry.external?.name ?? '-'}
														</TooltipTrigger>
														<TooltipContent>
															<p>{entry.external?.name ?? '-'}</p>
														</TooltipContent>
													</Tooltip>
												</TableCell>
												<TableCell>
													<Tooltip>
														<TooltipTrigger class="max-w-[150px] truncate">
															{entry.project?.name ?? '-'}
														</TooltipTrigger>
														<TooltipContent>
															<p>{entry.project?.name ?? '-'}</p>
														</TooltipContent>
													</Tooltip>
												</TableCell>
												<TableCell class="font-medium">
													{formatDuration(entry.minutes)}
												</TableCell>
												<TableCell>
													<div class="flex items-center gap-1">
														<Button
															variant="ghost"
															size="sm"
															class="h-8 w-8 p-0"
															onclick={() => handleEditExternalHours(entry)}
														>
															<span class="material-symbols-rounded text-xl!">edit</span>
															<span class="sr-only">Editar</span>
														</Button>
														<Button
															variant="ghost"
															size="sm"
															class="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
															onclick={() => handleDeleteExternalHours(entry)}
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
					</TabsContent>
				</Tabs>
			{:else}
				<!-- Non-admin view: just the time entries table -->
				{#if loadingEntries}
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Fecha</TableHead>
								<TableHead>Proyecto</TableHead>
								<TableHead>Tipo</TableHead>
								<TableHead>Inicio</TableHead>
								<TableHead>Fin</TableHead>
								<TableHead>Duración</TableHead>
								<TableHead>Lugar</TableHead>
								<TableHead class="w-[100px]">Acciones</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each Array(5) as _}
								<TableRow>
									<TableCell><Skeleton class="h-4 w-20" /></TableCell>
									<TableCell><Skeleton class="h-4 w-32" /></TableCell>
									<TableCell><Skeleton class="h-4 w-20" /></TableCell>
									<TableCell><Skeleton class="h-4 w-14" /></TableCell>
									<TableCell><Skeleton class="h-4 w-14" /></TableCell>
									<TableCell><Skeleton class="h-4 w-16" /></TableCell>
									<TableCell><Skeleton class="h-5 w-16 rounded-full" /></TableCell>
									<TableCell><Skeleton class="h-8 w-20" /></TableCell>
								</TableRow>
							{/each}
						</TableBody>
					</Table>
				{:else if entriesError}
					<div class="flex items-center justify-center py-8 text-destructive">
						<span class="material-symbols-rounded mr-2">error</span>
						{entriesError}
					</div>
				{:else if timeEntries.length === 0}
					<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
						<span class="material-symbols-rounded text-4xl! mb-2">history</span>
						<p>No hay registros de tiempo</p>
						<Button variant="outline" class="mt-4" onclick={handleCreateEntry}>
							<span class="material-symbols-rounded mr-2 text-lg!">add</span>
							Crear primer registro
						</Button>
					</div>
				{:else}
					<TooltipProvider>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Fecha</TableHead>
									<TableHead>Proyecto</TableHead>
									<TableHead>Tipo</TableHead>
									<TableHead>Inicio</TableHead>
									<TableHead>Fin</TableHead>
									<TableHead>Duración</TableHead>
									<TableHead>Lugar</TableHead>
									<TableHead class="w-[100px]">Acciones</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#each timeEntries as entry (entry.id)}
									<TableRow>
										<TableCell class="font-medium">
											{formatDate(entry.startedAt)}
										</TableCell>
										<TableCell>
											<Tooltip>
												<TooltipTrigger class="max-w-[150px] truncate">
													{entry.project?.name ?? '-'}
												</TooltipTrigger>
												<TooltipContent>
													<p>{entry.project?.name ?? '-'}</p>
												</TooltipContent>
											</Tooltip>
										</TableCell>
										<TableCell>
											<Badge variant="secondary">{entry.timeEntryType?.name ?? '-'}</Badge>
										</TableCell>
										<TableCell class="text-muted-foreground">
											{formatTime(entry.startedAt)}
										</TableCell>
										<TableCell class="text-muted-foreground">
											{formatTime(entry.endedAt)}
										</TableCell>
										<TableCell class="font-medium">
											{formatDuration(entry.minutes)}
										</TableCell>
										<TableCell>
											<Badge variant={entry.isOffice ? 'default' : 'outline'}>
												{entry.isOffice ? 'Oficina' : 'Remoto'}
											</Badge>
										</TableCell>
										<TableCell>
											<div class="flex items-center gap-1">
												<Button
													variant="ghost"
													size="sm"
													class="h-8 w-8 p-0"
													onclick={() => handleEditEntry(entry)}
												>
													<span class="material-symbols-rounded text-xl!">edit</span>
													<span class="sr-only">Editar</span>
												</Button>
												<Button
													variant="ghost"
													size="sm"
													class="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
													onclick={() => handleDeleteEntry(entry)}
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
			{/if}
		</CardContent>
	</Card>
</div>

<!-- Time Entry Modals -->
<TimeEntryFormModal
	bind:open={formModalOpen}
	entry={selectedEntry}
	{projects}
	{timeEntryTypes}
	onClose={handleModalClose}
	onSuccess={handleEntrySuccess}
/>

<TimeEntryDeleteDialog
	bind:open={deleteDialogOpen}
	entry={selectedEntry}
	onClose={handleModalClose}
	onSuccess={handleEntrySuccess}
/>

<!-- External Hours Modals (admin only) -->
{#if isAdmin}
	<ExternalHoursFormModal
		bind:open={externalHoursFormOpen}
		entry={selectedExternalHours}
		{externals}
		{projects}
		onClose={handleExternalHoursModalClose}
		onSuccess={handleExternalHoursSuccess}
	/>

	<ExternalHoursDeleteDialog
		bind:open={externalHoursDeleteOpen}
		entry={selectedExternalHours}
		onClose={handleExternalHoursModalClose}
		onSuccess={handleExternalHoursSuccess}
	/>
{/if}

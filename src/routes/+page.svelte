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
	import TimeEntryFormModal from '$lib/components/TimeEntryFormModal.svelte';
	import TimeEntryDeleteDialog from './TimeEntryDeleteDialog.svelte';
	import ExternalHoursFormModal from './ExternalHoursFormModal.svelte';
	import ExternalHoursDeleteDialog from './ExternalHoursDeleteDialog.svelte';
	import ComplianceWidget from './ComplianceWidget.svelte';
	import MissingLogsAlert from './MissingLogsAlert.svelte';
	import PendingAbsencesWidget from './PendingAbsencesWidget.svelte';
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
	import { fetchMyCalendar, type CalendarResponse } from '$lib/api/calendar';
	import { fetchAbsenceStats, type AbsenceStats } from '$lib/api/absences';
	import { isAdmin as isAdminStore } from '$lib/stores/auth';
	import ProjectLabel from '$lib/components/ProjectLabel.svelte';
	import { formatProjectLabel } from '$lib/utils';

	let isAdmin = $state(false);
	$effect(() => {
		const unsub = isAdminStore.subscribe((value) => {
			isAdmin = value;
		});
		return unsub;
	});

	let projects = $state<Project[]>([]);
	let timeEntryTypes = $state<TimeEntryType[]>([]);
	let timeEntries = $state<TimeEntry[]>([]);
	let activeTimer = $state<ActiveTimer | null>(null);

	let externals = $state<External[]>([]);
	let externalHours = $state<ExternalHours[]>([]);

	let loadingProjects = $state(true);
	let loadingTypes = $state(true);
	let loadingEntries = $state(true);
	let loadingTimer = $state(true);
	let loadingExternals = $state(true);
	let loadingExternalHours = $state(true);

	let entriesError = $state<string | null>(null);
	let externalHoursError = $state<string | null>(null);

	let selectedProjectId = $state<string | undefined>(undefined);
	let selectedEntryType = $state<string | undefined>(undefined);
	let isInOffice = $state(true);
	let startingTimer = $state(false);
	let stoppingTimer = $state(false);

	let showSwitchForm = $state(false);
	let switchProjectId = $state<string | undefined>(undefined);
	let switchEntryType = $state<string | undefined>(undefined);
	let switchIsInOffice = $state(true);
	let switchingTimer = $state(false);

	let formModalOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let selectedEntry = $state<TimeEntry | null>(null);

	let externalHoursFormOpen = $state(false);
	let externalHoursDeleteOpen = $state(false);
	let selectedExternalHours = $state<ExternalHours | null>(null);

	let activeTab = $state('my-entries');

	let elapsedSeconds = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	// Calendar and compliance data
	let calendarData = $state<CalendarResponse | null>(null);
	let absenceStats = $state<AbsenceStats | null>(null);
	let loadingCalendar = $state(true);
	let loadingAbsenceStats = $state(true);

	const missingDays = $derived(calendarData?.days.filter((d) => d.status === 'MISSING_LOGS') ?? []);

	const selectedProject = $derived(projects.find((p) => p.id === selectedProjectId));
	const selectedType = $derived(timeEntryTypes.find((t) => t.value === selectedEntryType));
	const switchProject = $derived(projects.find((p) => p.id === switchProjectId));
	const switchType = $derived(timeEntryTypes.find((t) => t.value === switchEntryType));
	const activeProjects = $derived(projects.filter((p) => p.isActive));
	const isWorkType = $derived(selectedType?.name === 'Trabajo');
	const isSwitchWorkType = $derived(switchType?.name === 'Trabajo');

	// Find the latest project from time entries (skip entries without projectId like pauses)
	const latestProjectId = $derived.by(() => {
		for (const entry of timeEntries) {
			if (entry.projectId) {
				// Check if project is still active
				const project = activeProjects.find((p) => p.id === entry.projectId);
				if (project) {
					return entry.projectId;
				}
			}
		}
		return null;
	});

	// Get the default project (latest or first active)
	const defaultProjectId = $derived.by(() => {
		if (latestProjectId) return latestProjectId;
		return activeProjects.length > 0 ? activeProjects[0].id : undefined;
	});

	// Handle project selection when switching entry types for timer form
	$effect(() => {
		if (
			isWorkType &&
			!selectedProjectId &&
			!loadingEntries &&
			!loadingProjects &&
			defaultProjectId
		) {
			// Switching to work type or initial load: set default project
			selectedProjectId = defaultProjectId;
		} else if (!isWorkType && selectedProjectId) {
			// Switching away from work type: clear project
			selectedProjectId = undefined;
		}
	});

	// Handle project selection when switching entry types for switch form
	$effect(() => {
		if (isSwitchWorkType && !switchProjectId && showSwitchForm && defaultProjectId) {
			// Switching to work type: set default project
			switchProjectId = defaultProjectId;
		} else if (!isSwitchWorkType && switchProjectId) {
			// Switching away from work type: clear project
			switchProjectId = undefined;
		}
	});

	const canStartTimer = $derived(
		selectedEntryType && (isWorkType ? selectedProjectId : true) && !startingTimer && !activeTimer
	);

	const timeEntryTypeLookup = $derived(
		timeEntryTypes.reduce<Record<string, TimeEntryType>>((acc, type) => {
			acc[type.value] = type;
			return acc;
		}, {})
	);

	function getEntryTypeName(value?: string, fallback?: string) {
		if (!value) return fallback ?? '-';
		return timeEntryTypeLookup[value]?.name ?? fallback ?? '-';
	}

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
			if (!selectedEntryType) {
				if (trabajoType) {
					selectedEntryType = trabajoType.value;
				} else if (timeEntryTypes.length > 0) {
					selectedEntryType = timeEntryTypes[0].value;
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

	async function loadCalendarData() {
		loadingCalendar = true;
		try {
			const now = new Date();
			const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
			const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
			const from = firstDay.toISOString().split('T')[0];
			const to = lastDay.toISOString().split('T')[0];
			calendarData = await fetchMyCalendar(from, to);
		} catch (e) {
			console.error('Error loading calendar data:', e);
		} finally {
			loadingCalendar = false;
		}
	}

	async function loadAbsenceStats() {
		if (!isAdmin) return;
		loadingAbsenceStats = true;
		try {
			absenceStats = await fetchAbsenceStats();
		} catch (e) {
			console.error('Error loading absence stats:', e);
		} finally {
			loadingAbsenceStats = false;
		}
	}

	function startElapsedTimer() {
		if (timerInterval) {
			clearInterval(timerInterval);
		}
		if (activeTimer) {
			const startTime = new Date(activeTimer.startTime).getTime();
			elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
			timerInterval = setInterval(() => {
				if (activeTimer) {
					const startTime = new Date(activeTimer.startTime).getTime();
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
		if (!selectedEntryType) return;
		if (isWorkType && !selectedProjectId) return;

		startingTimer = true;
		try {
			activeTimer = await startTimer({
				projectId: isWorkType ? selectedProjectId : undefined,
				entryType: selectedEntryType,
				isInOffice
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
		if (activeTimer) {
			switchEntryType = activeTimer.entryType;
			switchIsInOffice = activeTimer.isInOffice;
		}
		switchProjectId = undefined;
		showSwitchForm = true;
	}

	function handleCancelSwitch() {
		showSwitchForm = false;
		switchProjectId = undefined;
		switchEntryType = undefined;
	}

	async function handleSwitchTimer() {
		if (!switchEntryType) return;
		if (isSwitchWorkType && !switchProjectId) return;

		switchingTimer = true;
		try {
			const result = await switchTimer({
				projectId: isSwitchWorkType ? switchProjectId : undefined,
				entryType: switchEntryType,
				isInOffice: switchIsInOffice
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
		loadExternals();
		loadExternalHours();
		loadCalendarData();
		loadAbsenceStats();
	});

	onDestroy(() => {
		stopElapsedTimer();
	});
</script>

<div class="grow p-6 space-y-6">

	{#if isAdmin && absenceStats && absenceStats.pending > 0}
		<div class="w-full max-w-5xl mx-auto">
			<PendingAbsencesWidget
				pendingCount={absenceStats?.pending ?? 0}
				loading={loadingAbsenceStats}
			/>
		</div>
	{/if}

	<div class="w-full max-w-5xl mx-auto flex items-stretch gap-4">
		<div class="flex-1 flex flex-col">
			<ComplianceWidget summary={calendarData?.summary ?? null} loading={loadingCalendar} />
		</div>
		<div class="flex-1 flex flex-col">
			<MissingLogsAlert {missingDays} loading={loadingCalendar} />
		</div>
	</div>

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
								<Badge variant="secondary">
									{getEntryTypeName(
										activeTimer.entryType,
										activeTimer.timeEntryType?.name ?? activeTimer.entryTypeName ?? 'Tipo'
									)}
								</Badge>
								<Badge variant={activeTimer.isInOffice ? 'default' : 'outline'}>
									{activeTimer.isInOffice ? 'Oficina' : 'Remoto'}
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
									<Label>Tipo</Label>
									<Select type="single" bind:value={switchEntryType} disabled={switchingTimer}>
										<SelectTrigger class="w-full">
											{#if switchType}
												{switchType.name}
											{:else}
												<span class="text-muted-foreground">Seleccionar tipo</span>
											{/if}
										</SelectTrigger>
										<SelectContent>
											{#each timeEntryTypes as type (type.value)}
												<SelectItem value={type.value} label={type.name} />
											{/each}
										</SelectContent>
									</Select>
								</div>
								{#if isSwitchWorkType}
									<div class="grid gap-2">
										<Label>Proyecto</Label>
										<Select type="single" bind:value={switchProjectId} disabled={switchingTimer}>
											<SelectTrigger class="w-full min-w-0">
												<div class="flex min-w-0 items-center">
													{#if switchProject}
														<ProjectLabel project={switchProject} truncate />
													{:else}
														<span class="text-muted-foreground">Seleccionar proyecto</span>
													{/if}
												</div>
											</SelectTrigger>
											<SelectContent>
												{#each activeProjects as project (project.id)}
													<SelectItem value={project.id} label={formatProjectLabel(project)}>
														<ProjectLabel {project} className="flex-1 min-w-0" />
													</SelectItem>
												{/each}
											</SelectContent>
										</Select>
									</div>
								{/if}
							</div>
							<div class="flex items-center gap-3">
								<Switch
									id="switchIsInOffice"
									bind:checked={switchIsInOffice}
									disabled={switchingTimer}
								/>
								<Label for="switchIsInOffice" class="cursor-pointer">
									{switchIsInOffice ? 'Oficina' : 'Remoto'}
								</Label>
							</div>
							<div class="flex gap-2 justify-end">
								<Button variant="outline" onclick={handleCancelSwitch} disabled={switchingTimer}>
									Cancelar
								</Button>
								<Button
									onclick={handleSwitchTimer}
									disabled={!switchEntryType ||
										(isSwitchWorkType && !switchProjectId) ||
										switchingTimer}
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
							<Label>Tipo</Label>
							<Select type="single" bind:value={selectedEntryType} disabled={startingTimer}>
								<SelectTrigger class="w-full">
									{#if selectedType}
										{selectedType.name}
									{:else}
										<span class="text-muted-foreground">Seleccionar tipo</span>
									{/if}
								</SelectTrigger>
								<SelectContent>
									{#each timeEntryTypes as type (type.value)}
										<SelectItem value={type.value} label={type.name} />
									{/each}
								</SelectContent>
							</Select>
						</div>
						{#if isWorkType}
							<div class="grid gap-2">
								<Label>Proyecto</Label>
								<Select type="single" bind:value={selectedProjectId} disabled={startingTimer}>
									<SelectTrigger class="w-full min-w-0">
										<div class="flex min-w-0 items-center">
											{#if selectedProject}
												<ProjectLabel project={selectedProject} truncate />
											{:else}
												<span class="text-muted-foreground">Seleccionar proyecto</span>
											{/if}
										</div>
									</SelectTrigger>
									<SelectContent>
										{#each activeProjects as project (project.id)}
											<SelectItem value={project.id} label={formatProjectLabel(project)}>
												<ProjectLabel {project} className="flex-1 min-w-0" />
											</SelectItem>
										{/each}
									</SelectContent>
								</Select>
							</div>
						{/if}
					</div>
					<div class="flex items-center justify-between flex-wrap gap-4">
						<div class="flex items-center gap-3">
							<Switch id="isInOffice" bind:checked={isInOffice} disabled={startingTimer} />
							<Label for="isInOffice" class="cursor-pointer">
								{isInOffice ? 'Oficina' : 'Remoto'}
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
									{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
										<TableRow data-placeholder-index={i}>
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
													{formatDate(entry.startTime)}
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
													<Badge variant="secondary">
														{getEntryTypeName(
															entry.entryType,
															entry.timeEntryType?.name ?? entry.entryTypeName ?? '-'
														)}
													</Badge>
												</TableCell>
												<TableCell class="text-muted-foreground">
													{formatTime(entry.startTime)}
												</TableCell>
												<TableCell class="text-muted-foreground">
													{formatTime(entry.endTime)}
												</TableCell>
												<TableCell class="font-medium">
													{formatDuration(entry.durationMinutes)}
												</TableCell>
												<TableCell>
													<Badge variant={entry.isInOffice ? 'default' : 'outline'}>
														{entry.isInOffice ? 'Oficina' : 'Remoto'}
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
									{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
										<TableRow data-placeholder-index={i}>
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
							{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
								<TableRow data-placeholder-index={i}>
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
											{formatDate(entry.startTime)}
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
											<Badge variant="secondary">
												{getEntryTypeName(
													entry.entryType,
													entry.timeEntryType?.name ?? entry.entryTypeName ?? '-'
												)}
											</Badge>
										</TableCell>
										<TableCell class="text-muted-foreground">
											{formatTime(entry.startTime)}
										</TableCell>
										<TableCell class="text-muted-foreground">
											{formatTime(entry.endTime)}
										</TableCell>
										<TableCell class="font-medium">
											{formatDuration(entry.durationMinutes)}
										</TableCell>
										<TableCell>
											<Badge variant={entry.isInOffice ? 'default' : 'outline'}>
												{entry.isInOffice ? 'Oficina' : 'Remoto'}
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

<TimeEntryFormModal
	bind:open={formModalOpen}
	entry={selectedEntry}
	{projects}
	{timeEntryTypes}
	{latestProjectId}
	onClose={handleModalClose}
	onSuccess={handleEntrySuccess}
/>

<TimeEntryDeleteDialog
	bind:open={deleteDialogOpen}
	entry={selectedEntry}
	onClose={handleModalClose}
	onSuccess={handleEntrySuccess}
/>

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

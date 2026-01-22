<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import TimeEntryFormModal from '$lib/components/TimeEntryFormModal.svelte';
	import TimeEntryDeleteDialog from './TimeEntryDeleteDialog.svelte';
	import ComplianceWidget from './ComplianceWidget.svelte';
	import MissingLogsAlert from './MissingLogsAlert.svelte';
	import PendingAbsencesWidget from '$lib/components/PendingAbsencesWidget.svelte';
	import PendingJoinRequestsWidget from '$lib/components/PendingJoinRequestsWidget.svelte';
	import TimeEntriesTable from '$lib/components/TimeEntriesTable.svelte';
	import TimerCard from '$lib/components/TimerCard.svelte';
	import { fetchProjects, type Project } from '$lib/api/projects';
	import {
		fetchMyTimeEntries,
		fetchTimeEntryTypes,
		type TimeEntry,
		type TimeEntryType
	} from '$lib/api/time-entries';
	import { fetchMyCalendarMonth, type CalendarMonthResponse } from '$lib/api/calendar';
	import { fetchAbsenceStats, type AbsenceStats } from '$lib/api/absences';
	import { fetchJoinRequests, type AdminJoinRequest } from '$lib/api/invitations';
	import {
		isAdmin as isAdminStore,
		isGuest as isGuestStore,
		isTeamLeader as isTeamLeaderStore,
		activeProfile
	} from '$lib/stores/auth';
	import GuestBanner from '$lib/components/GuestBanner.svelte';
	import { formatMonthYear } from '$lib/utils';

	let isAdmin = $state(false);
	let isGuest = $state(false);
	let isTeamLeader = $state(false);
	let currentProfile = $state<typeof $activeProfile>(null);

	$effect(() => {
		const unsub = isAdminStore.subscribe((value) => {
			isAdmin = value;
		});
		return unsub;
	});

	$effect(() => {
		const unsub = isGuestStore.subscribe((value) => {
			isGuest = value;
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
		const unsub = activeProfile.subscribe((value) => {
			currentProfile = value;
		});
		return unsub;
	});

	let projects = $state<Project[]>([]);
	let timeEntryTypes = $state<TimeEntryType[]>([]);
	let timeEntries = $state<TimeEntry[]>([]);

	let loadingProjects = $state(true);
	let loadingTypes = $state(true);
	let loadingEntries = $state(true);

	let entriesError = $state<string | null>(null);

	let formModalOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let selectedEntry = $state<TimeEntry | null>(null);

	let selectedMonth = $state(new Date());
	const isCurrentMonth = $derived(() => {
		const now = new Date();
		return (
			selectedMonth.getFullYear() === now.getFullYear() &&
			selectedMonth.getMonth() === now.getMonth()
		);
	});

	function goToPreviousMonth() {
		selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
		loadEntries();
	}

	function goToNextMonth() {
		selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
		loadEntries();
	}

	let calendarData = $state<CalendarMonthResponse | null>(null);
	let absenceStats = $state<AbsenceStats | null>(null);
	let joinRequests = $state<AdminJoinRequest[]>([]);
	let loadingCalendar = $state(true);
	let loadingAbsenceStats = $state(true);
	let loadingJoinRequests = $state(true);

	const pendingJoinRequestsCount = $derived(
		joinRequests.filter((r) => r.status === 'PENDING').length
	);

	let hasActiveTimer = $state(false);

	const todayString = $derived(() => {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
	});

	const missingDays = $derived(
		(calendarData?.days.filter((d) => d.status === 'MISSING_LOGS') ?? []).filter(
			(d) => !(hasActiveTimer && d.date === todayString())
		)
	);

	const activeProjects = $derived(projects.filter((p) => p.isActive));
	const hasProjects = $derived(activeProjects.length > 0);

	let latestProjectId = $state<string | null>(null);

	$effect(() => {
		let found: string | null = null;
		for (const entry of timeEntries) {
			if (entry.projectId) {
				const project = activeProjects.find((p) => p.id === entry.projectId);
				if (project) {
					found = entry.projectId;
					break;
				}
			}
		}

		latestProjectId = found;
	});

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
			const year = selectedMonth.getFullYear();
			const month = selectedMonth.getMonth();
			timeEntries = await fetchMyTimeEntries(year, month);
		} catch (e) {
			entriesError = e instanceof Error ? e.message : 'Error desconocido';
		} finally {
			loadingEntries = false;
		}
	}

	async function loadCalendarData() {
		loadingCalendar = true;
		try {
			const now = new Date();
			calendarData = await fetchMyCalendarMonth(now.getFullYear(), now.getMonth());
		} catch (e) {
			console.error('Error loading calendar data:', e);
		} finally {
			loadingCalendar = false;
		}
	}

	async function loadAbsenceStats() {
		if (!isAdmin && !isTeamLeader) return;
		loadingAbsenceStats = true;
		try {
			absenceStats = await fetchAbsenceStats();
		} catch (e) {
			console.error('Error loading absence stats:', e);
		} finally {
			loadingAbsenceStats = false;
		}
	}

	async function loadJoinRequests() {
		if (!isAdmin) return;
		loadingJoinRequests = true;
		try {
			joinRequests = await fetchJoinRequests();
		} catch (e) {
			console.error('Error loading join requests:', e);
		} finally {
			loadingJoinRequests = false;
		}
	}

	function handleTimerStop() {
		loadEntries();
		loadCalendarData();
	}

	function handleTimerSwitch() {
		loadEntries();
		loadCalendarData();
	}

	function handleActiveTimerChange(active: boolean) {
		hasActiveTimer = active;
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
		loadCalendarData();
	}

	onMount(() => {
		loadProjects();
		loadTypes();
		// Only load personal data for non-GUEST users
		if (!isGuest) {
			loadEntries();
			loadCalendarData();
		}
		loadAbsenceStats();
		loadJoinRequests();
	});
</script>

<div class="grow p-6 space-y-6">
	{#if (isAdmin || isTeamLeader) && (absenceStats?.pending ?? 0) > 0}
		<div class="w-full max-w-6xl mx-auto">
			<PendingAbsencesWidget
				pendingCount={absenceStats?.pending ?? 0}
				loading={loadingAbsenceStats}
			/>
		</div>
	{/if}

	{#if isAdmin && pendingJoinRequestsCount > 0}
		<div class="w-full max-w-6xl mx-auto">
			<PendingJoinRequestsWidget
				pendingCount={pendingJoinRequestsCount}
				loading={loadingJoinRequests}
			/>
		</div>
	{/if}

	{#if isGuest}
		<!-- GUEST user welcome message -->
		<Card class="w-full max-w-6xl mx-auto">
			<CardHeader>
				<CardTitle class="text-2xl font-semibold tracking-tight flex items-center gap-2">
					<span class="material-symbols-rounded text-3xl!">waving_hand</span>
					Bienvenido
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<GuestBanner />
				<p class="text-muted-foreground">
					Estás accediendo a <strong>{currentProfile?.company.name ?? 'esta empresa'}</strong> como usuario
					invitado. Los usuarios invitados pueden ver información de la empresa pero no pueden registrar
					su propio tiempo de trabajo.
				</p>
				{#if isAdmin}
					<p class="text-muted-foreground">
						Como administrador, puedes acceder a la configuración de la empresa, ver analíticas y
						gestionar usuarios desde el menú de navegación.
					</p>
				{/if}
			</CardContent>
		</Card>
	{:else}
		{#if missingDays.length > 0}
			<div class="w-full max-w-6xl mx-auto">
				<MissingLogsAlert {missingDays} loading={loadingCalendar} />
			</div>
		{/if}

		<div class="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
			<TimerCard
				{projects}
				{timeEntryTypes}
				{latestProjectId}
				{loadingProjects}
				{loadingTypes}
				onTimerStop={handleTimerStop}
				onTimerSwitch={handleTimerSwitch}
				onActiveTimerChange={handleActiveTimerChange}
			/>

			<ComplianceWidget
				summary={calendarData?.summary ?? null}
				loading={loadingCalendar}
				{hasProjects}
			/>
		</div>

		<!-- Time Entries Card -->
		<Card class="w-full max-w-6xl mx-auto">
			<CardHeader
				class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0"
			>
				<CardTitle class="text-2xl font-semibold tracking-tight">Historial</CardTitle>
				<div class="flex items-center gap-2 flex-wrap">
					<!-- Month Navigation -->
					<div class="flex items-center gap-1 bg-muted rounded-lg p-1">
						<Button
							variant="ghost"
							size="sm"
							class="h-8 w-8 p-0"
							onclick={goToPreviousMonth}
							disabled={loadingEntries}
						>
							<span class="material-symbols-rounded text-lg!">chevron_left</span>
							<span class="sr-only">Mes anterior</span>
						</Button>
						<span class="px-2 text-sm font-medium min-w-22 text-center">
							{formatMonthYear(selectedMonth)}
						</span>
						<Button
							variant="ghost"
							size="sm"
							class="h-8 w-8 p-0"
							onclick={goToNextMonth}
							disabled={loadingEntries || isCurrentMonth()}
						>
							<span class="material-symbols-rounded text-lg!">chevron_right</span>
							<span class="sr-only">Mes siguiente</span>
						</Button>
					</div>
					<!-- Add Button -->
					<Button onclick={handleCreateEntry}>
						<span class="material-symbols-rounded text-lg!">add</span>
						Añadir
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<TimeEntriesTable
					{timeEntries}
					{timeEntryTypes}
					loading={loadingEntries}
					error={entriesError}
					{hasProjects}
					onEdit={handleEditEntry}
					onDelete={handleDeleteEntry}
					onCreate={handleCreateEntry}
				/>
			</CardContent>
		</Card>
	{/if}
</div>

{#if !isGuest}
	<TimeEntryFormModal
		bind:open={formModalOpen}
		entry={selectedEntry}
		{projects}
		{timeEntryTypes}
		{latestProjectId}
		existingEntries={timeEntries}
		onClose={handleModalClose}
		onSuccess={handleEntrySuccess}
	/>

	<TimeEntryDeleteDialog
		bind:open={deleteDialogOpen}
		entry={selectedEntry}
		onClose={handleModalClose}
		onSuccess={handleEntrySuccess}
	/>
{/if}

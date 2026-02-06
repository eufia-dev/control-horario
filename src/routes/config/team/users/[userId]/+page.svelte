<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import WorkingCalendar from '../../../../calendar/WorkingCalendar.svelte';
	import CalendarDayDetail from '../../../../calendar/CalendarDayDetail.svelte';
	import TimeEntriesCard from '$lib/components/TimeEntriesCard.svelte';
	import AuditLogDialog from '$lib/components/AuditLogDialog.svelte';
	import AuditLogFeed from '$lib/components/AuditLogFeed.svelte';
	import { canAccessAdmin as canAccessAdminStore } from '$lib/stores/auth';
	import { fetchUsers, type User } from '$lib/api/users';
	import {
		fetchUserTimeEntries,
		fetchTimeEntryTypes,
		type TimeEntry,
		type TimeEntryType
	} from '$lib/api/time-entries';
	import {
		fetchCalendarMonth,
		type CalendarDay,
		type CalendarMonthResponse
	} from '$lib/api/calendar';
	import {
		fetchUserAuditLogs,
		type AuditLogWithEntry
	} from '$lib/api/audit-logs';
	import { formatMonthYear } from '$lib/utils';

	let canAccessAdmin = $state(false);

	$effect(() => {
		const unsub = canAccessAdminStore.subscribe((value) => {
			canAccessAdmin = value;
		});
		return unsub;
	});

	// Get userId from route params
	let userId = $derived($page.params.userId);

	// User data
	let user = $state<User | null>(null);
	let loadingUser = $state(true);
	let userError = $state<string | null>(null);

	// Time entries data
	let timeEntries = $state<TimeEntry[]>([]);
	let timeEntryTypes = $state<TimeEntryType[]>([]);
	let loadingEntries = $state(true);
	let loadingTypes = $state(true);
	let entriesError = $state<string | null>(null);

	// Month navigation state
	let selectedMonth = $state(new Date());

	// Calendar data
	let calendarData = $state<CalendarMonthResponse | null>(null);
	let loadingCalendar = $state(true);
	let calendarError = $state<string | null>(null);
	let currentMonth = $state(new Date());
	let selectedDay = $state<CalendarDay | null>(null);
	let dayDetailOpen = $state(false);

	// Audit log data
	let auditLogs = $state<AuditLogWithEntry[]>([]);
	let loadingAuditLogs = $state(false);
	let auditLogsError = $state<string | null>(null);
	let auditMonth = $state(new Date());

	// Audit log sheet
	let auditSheetOpen = $state(false);
	let auditSheetEntry = $state<TimeEntry | null>(null);

	let activeTab = $state('historial');

	const isAuditCurrentMonth = $derived(() => {
		const now = new Date();
		return (
			auditMonth.getFullYear() === now.getFullYear() &&
			auditMonth.getMonth() === now.getMonth()
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

	function goToAuditPreviousMonth() {
		auditMonth = new Date(auditMonth.getFullYear(), auditMonth.getMonth() - 1, 1);
	}

	function goToAuditNextMonth() {
		auditMonth = new Date(auditMonth.getFullYear(), auditMonth.getMonth() + 1, 1);
	}

	async function loadUser() {
		loadingUser = true;
		userError = null;
		try {
			const users = await fetchUsers();
			user = users.find((u) => u.id === userId) ?? null;
			if (!user) {
				userError = 'Usuario no encontrado';
			}
		} catch (e) {
			userError = e instanceof Error ? e.message : 'Error al cargar usuario';
		} finally {
			loadingUser = false;
		}
	}

	async function loadEntries() {
		loadingEntries = true;
		entriesError = null;
		try {
			if (!userId) return;
			const year = selectedMonth.getFullYear();
			const month = selectedMonth.getMonth();
			timeEntries = await fetchUserTimeEntries(userId, year, month);
		} catch (e) {
			entriesError = e instanceof Error ? e.message : 'Error al cargar registros';
		} finally {
			loadingEntries = false;
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

	async function loadCalendar() {
		loadingCalendar = true;
		calendarError = null;
		try {
			if (!userId) return;
			const year = currentMonth.getFullYear();
			const month = currentMonth.getMonth(); // 0-indexed
			calendarData = await fetchCalendarMonth(year, month, userId);
		} catch (e) {
			calendarError = e instanceof Error ? e.message : 'Error al cargar calendario';
		} finally {
			loadingCalendar = false;
		}
	}

	async function loadAuditLogs() {
		loadingAuditLogs = true;
		auditLogsError = null;
		try {
			if (!userId) return;
			const year = auditMonth.getFullYear();
			const month = auditMonth.getMonth();
			auditLogs = await fetchUserAuditLogs(userId, year, month);
		} catch (e) {
			auditLogsError = e instanceof Error ? e.message : 'Error al cargar auditoría';
		} finally {
			loadingAuditLogs = false;
		}
	}

	function handlePrevMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
	}

	function handleNextMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
	}

	function handleDayClick(day: CalendarDay) {
		selectedDay = day;
		dayDetailOpen = true;
	}

	function handleDayDetailClose() {
		selectedDay = null;
	}

	function handleViewAuditLog(entry: TimeEntry) {
		auditSheetEntry = entry;
		auditSheetOpen = true;
	}

	function handleAuditSheetClose() {
		auditSheetEntry = null;
	}

	function handleViewEntryFromFeed(log: AuditLogWithEntry) {
		if (log.timeEntry && userId) {
			// Build a minimal TimeEntry to open the sheet
			const entry: TimeEntry = {
				id: log.timeEntry.id,
				userId,
				companyId: '',
				projectId: '',
				entryType: log.timeEntry.entryType,
				startTime: log.timeEntry.startTime,
				endTime: log.timeEntry.endTime,
				durationMinutes: log.timeEntry.durationMinutes,
				isInOffice: false,
				createdAt: ''
			};
			auditSheetEntry = entry;
			auditSheetOpen = true;
		}
	}

	// Reload calendar when month changes
	$effect(() => {
		if (userId) {
			loadCalendar();
		}
	});

	// Reload audit logs when audit month changes or tab switches to auditoría
	$effect(() => {
		if (userId && activeTab === 'auditoria') {
			// Track auditMonth to re-trigger on change
			const _year = auditMonth.getFullYear();
			const _month = auditMonth.getMonth();
			loadAuditLogs();
		}
	});

	onMount(() => {
		loadUser();
		loadEntries();
		loadTypes();
	});
</script>

{#if canAccessAdmin}
	<div class="grow flex flex-col gap-6 p-6">
		<!-- Header -->
		<div class="flex items-center gap-2">
			<Button variant="ghost" size="sm" onclick={() => goto(resolve('/config/team'))}>
				<span class="material-symbols-rounded text-lg!">arrow_back</span>
			</Button>
			<span class="material-symbols-rounded text-3xl!">person</span>
			{#if loadingUser}
				<Skeleton class="h-8 w-48" />
			{:else if user}
				<h1 class="text-2xl font-semibold tracking-tight">{user.name}</h1>
				<Badge variant="secondary" class="ml-2">{user.email}</Badge>
			{:else}
				<h1 class="text-2xl font-semibold tracking-tight text-destructive">
					Usuario no encontrado
				</h1>
			{/if}
		</div>

		{#if userError}
			<Card class="w-full max-w-6xl mx-auto">
				<CardContent class="py-12">
					<div class="flex flex-col items-center justify-center text-destructive">
						<span class="material-symbols-rounded text-4xl! mb-2">error</span>
						<p>{userError}</p>
						<Button variant="outline" class="mt-4" onclick={() => goto(resolve('/config/team'))}>
							Volver al equipo
						</Button>
					</div>
				</CardContent>
			</Card>
		{:else}
			<Tabs bind:value={activeTab} class="w-full max-w-6xl mx-auto">
				<TabsList class="mb-4">
					<TabsTrigger value="historial" class="gap-1.5">
						<span class="material-symbols-rounded text-lg!">history</span>
						<span>Historial</span>
					</TabsTrigger>
					<TabsTrigger value="calendario" class="gap-1.5">
						<span class="material-symbols-rounded text-lg!">calendar_month</span>
						<span>Calendario</span>
					</TabsTrigger>
					<TabsTrigger value="auditoria" class="gap-1.5">
						<span class="material-symbols-rounded text-lg!">policy</span>
						<span>Auditoría</span>
					</TabsTrigger>
				</TabsList>

				<!-- Time Entries Tab -->
				<TabsContent value="historial">
					<TimeEntriesCard
						title="Registros de tiempo"
						{timeEntries}
						{timeEntryTypes}
						loading={loadingEntries || loadingTypes}
						error={entriesError}
						{selectedMonth}
						hasProjects={true}
						showSourceColumn={true}
						showStatusColumn={true}
						showActions={false}
						showAddButton={false}
						onPreviousMonth={goToPreviousMonth}
						onNextMonth={goToNextMonth}
						onViewAuditLog={handleViewAuditLog}
					/>
				</TabsContent>

				<!-- Calendar Tab -->
				<TabsContent value="calendario">
					<Card>
						<CardHeader>
							<CardTitle class="sr-only">Calendario del mes</CardTitle>
						</CardHeader>
						<CardContent>
							{#if loadingCalendar}
								<div class="space-y-4">
									<div class="flex items-center justify-between">
										<Skeleton class="h-9 w-9" />
										<Skeleton class="h-6 w-40" />
										<Skeleton class="h-9 w-9" />
									</div>
									<Skeleton class="h-12 w-full" />
									<div class="grid grid-cols-7 gap-1">
										{#each Array.from({ length: 35 }, (_, i) => i) as i (i)}
											<Skeleton class="h-[72px] w-full" />
										{/each}
									</div>
								</div>
							{:else if calendarError}
								<div class="flex flex-col items-center justify-center py-12 text-destructive">
									<span class="material-symbols-rounded text-4xl! mb-2">error</span>
									<p>{calendarError}</p>
									<Button variant="outline" class="mt-4" onclick={loadCalendar}>
										<span class="material-symbols-rounded text-lg! mr-2">refresh</span>
										Reintentar
									</Button>
								</div>
							{:else if calendarData}
								<WorkingCalendar
									days={calendarData.days}
									summary={calendarData.summary}
									{currentMonth}
									onPrevMonth={handlePrevMonth}
									onNextMonth={handleNextMonth}
									onDayClick={handleDayClick}
								/>
							{/if}
						</CardContent>
					</Card>
				</TabsContent>

				<!-- Audit Log Tab -->
				<TabsContent value="auditoria">
					<Card>
						<CardHeader class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0">
							<CardTitle class="text-xl font-semibold tracking-tight flex items-center gap-2">
								<span class="material-symbols-rounded text-2xl!">policy</span>
								Auditoría de cambios
							</CardTitle>
							<div class="flex items-center gap-1 bg-muted rounded-lg p-1">
								<Button
									variant="ghost"
									size="sm"
									class="h-8 w-8 p-0"
									onclick={goToAuditPreviousMonth}
									disabled={loadingAuditLogs}
								>
									<span class="material-symbols-rounded text-lg!">chevron_left</span>
									<span class="sr-only">Mes anterior</span>
								</Button>
								<span class="px-2 text-sm font-medium min-w-22 text-center">
									{formatMonthYear(auditMonth)}
								</span>
								<Button
									variant="ghost"
									size="sm"
									class="h-8 w-8 p-0"
									onclick={goToAuditNextMonth}
									disabled={loadingAuditLogs || isAuditCurrentMonth()}
								>
									<span class="material-symbols-rounded text-lg!">chevron_right</span>
									<span class="sr-only">Mes siguiente</span>
								</Button>
							</div>
						</CardHeader>
						<CardContent>
							<AuditLogFeed
								{auditLogs}
								loading={loadingAuditLogs}
								error={auditLogsError}
								onViewEntry={handleViewEntryFromFeed}
							/>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		{/if}
	</div>

	<CalendarDayDetail bind:open={dayDetailOpen} day={selectedDay} onClose={handleDayDetailClose} />
	<AuditLogDialog bind:open={auditSheetOpen} entry={auditSheetEntry} onClose={handleAuditSheetClose} />
{/if}

<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
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
	import {
		Tooltip,
		TooltipContent,
		TooltipProvider,
		TooltipTrigger
	} from '$lib/components/ui/tooltip';
	import WorkingCalendar from '../../../calendar/WorkingCalendar.svelte';
	import CalendarDayDetail from '../../../calendar/CalendarDayDetail.svelte';
	import { auth, isAdmin as isAdminStore } from '$lib/stores/auth';
	import { fetchUsers, type User } from '$lib/api/users';
	import {
		fetchUserTimeEntries,
		fetchTimeEntryTypes,
		type TimeEntry,
		type TimeEntryType
	} from '$lib/api/time-entries';
	import { fetchCalendar, type CalendarDay, type CalendarResponse } from '$lib/api/calendar';

	let isAdmin = $state(false);
	$effect(() => {
		const unsub = isAdminStore.subscribe((value) => {
			isAdmin = value;
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
	const isCurrentMonth = $derived(() => {
		const now = new Date();
		return (
			selectedMonth.getFullYear() === now.getFullYear() &&
			selectedMonth.getMonth() === now.getMonth()
		);
	});

	// Calendar data
	let calendarData = $state<CalendarResponse | null>(null);
	let loadingCalendar = $state(true);
	let calendarError = $state<string | null>(null);
	let currentMonth = $state(new Date());
	let selectedDay = $state<CalendarDay | null>(null);
	let dayDetailOpen = $state(false);

	let activeTab = $state('historial');

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

	function formatMonthYear(date: Date): string {
		const now = new Date();
		const isCurrentYear = date.getFullYear() === now.getFullYear();

		if (isCurrentYear) {
			// Only show month name for current year
			const monthName = date.toLocaleDateString('es-ES', { month: 'long' });
			return monthName.charAt(0).toUpperCase() + monthName.slice(1);
		} else {
			// Show month and year for other years
			const formatted = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
			return formatted.charAt(0).toUpperCase() + formatted.slice(1);
		}
	}

	function goToPreviousMonth() {
		selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
		loadEntries();
	}

	function goToNextMonth() {
		selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
		loadEntries();
	}

	function goToCurrentMonth() {
		selectedMonth = new Date();
		loadEntries();
	}

	function getSourceLabel(source?: string): string {
		const sourceLabels: Record<string, string> = {
			WEB: 'Web',
			APP: 'App',
			WHATSAPP: 'WhatsApp'
		};
		return sourceLabels[source ?? ''] ?? source ?? '-';
	}

	function formatLocalDateKey(date: Date): string {
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, '0');
		const d = String(date.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}

	function getMonthRange(date: Date): { from: string; to: string } {
		const year = date.getFullYear();
		const month = date.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);

		const firstDowMon0 = (firstDay.getDay() + 6) % 7;
		const start = new Date(firstDay);
		start.setDate(firstDay.getDate() - firstDowMon0);

		const lastDowMon0 = (lastDay.getDay() + 6) % 7;
		const end = new Date(lastDay);
		end.setDate(lastDay.getDate() + (6 - lastDowMon0));

		return {
			from: formatLocalDateKey(start),
			to: formatLocalDateKey(end)
		};
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
			const month = selectedMonth.getMonth() + 1; // 1-12 for backend
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
			const { from, to } = getMonthRange(currentMonth);
			calendarData = await fetchCalendar(from, to, userId);
		} catch (e) {
			calendarError = e instanceof Error ? e.message : 'Error al cargar calendario';
		} finally {
			loadingCalendar = false;
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

	// Reload calendar when month changes
	$effect(() => {
		if (userId) {
			loadCalendar();
		}
	});

	onMount(() => {
		const role = $auth.user?.role;
		if (role !== 'OWNER' && role !== 'ADMIN') {
			goto(resolve('/'));
			return;
		}

		loadUser();
		loadEntries();
		loadTypes();
	});

	$effect(() => {
		const role = $auth.user?.role;
		if (!$auth.isInitializing && role !== 'OWNER' && role !== 'ADMIN') {
			goto(resolve('/'));
		}
	});
</script>

{#if isAdmin}
	<div class="grow flex flex-col gap-6 p-6">
		<!-- Header -->
		<div class="flex items-center gap-2">
			<Button variant="ghost" size="sm" onclick={() => goto('/admin?tab=equipo')}>
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
			<Card class="w-full max-w-5xl mx-auto">
				<CardContent class="py-12">
					<div class="flex flex-col items-center justify-center text-destructive">
						<span class="material-symbols-rounded text-4xl! mb-2">error</span>
						<p>{userError}</p>
						<Button variant="outline" class="mt-4" onclick={() => goto('/admin?tab=equipo')}>
							Volver al equipo
						</Button>
					</div>
				</CardContent>
			</Card>
		{:else}
			<Tabs bind:value={activeTab} class="w-full max-w-5xl mx-auto">
				<TabsList class="mb-4">
					<TabsTrigger value="historial" class="gap-1.5">
						<span class="material-symbols-rounded text-lg!">history</span>
						<span>Historial</span>
					</TabsTrigger>
					<TabsTrigger value="calendario" class="gap-1.5">
						<span class="material-symbols-rounded text-lg!">calendar_month</span>
						<span>Calendario</span>
					</TabsTrigger>
				</TabsList>

				<!-- Time Entries Tab -->
				<TabsContent value="historial">
					<Card>
						<CardHeader class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0">
							<CardTitle class="text-xl font-semibold tracking-tight flex items-center gap-2">
								<span class="material-symbols-rounded text-2xl!">schedule</span>
								Registros de tiempo
							</CardTitle>
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
								<span class="px-2 text-sm font-medium min-w-[120px] text-center">
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
						</CardHeader>
						<CardContent>
							{#if loadingEntries || loadingTypes}
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
											<TableHead>Origen</TableHead>
											<TableHead>Estado</TableHead>
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
												<TableCell><Skeleton class="h-4 w-16" /></TableCell>
												<TableCell><Skeleton class="h-5 w-20 rounded-full" /></TableCell>
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
									<p>No hay registros de tiempo para este usuario</p>
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
												<TableHead>Origen</TableHead>
												<TableHead>Estado</TableHead>
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
														<Badge variant="outline">
															{getSourceLabel(entry.source)}
														</Badge>
													</TableCell>
													<TableCell>
														<div class="flex items-center gap-1 flex-wrap">
															{#if entry.isManual}
																<Tooltip>
																	<TooltipTrigger>
																		<Badge variant="secondary" class="text-xs">
																			<span class="material-symbols-rounded text-sm! mr-0.5"
																				>edit</span
																			>
																			Manual
																		</Badge>
																	</TooltipTrigger>
																	<TooltipContent>
																		<p>Registro creado manualmente</p>
																	</TooltipContent>
																</Tooltip>
															{/if}
															{#if entry.isModified}
																<Tooltip>
																	<TooltipTrigger>
																		<Badge
																			variant="outline"
																			class="text-xs text-yellow-600 border-yellow-600"
																		>
																			<span class="material-symbols-rounded text-sm! mr-0.5"
																				>sync</span
																			>
																			Modificado
																		</Badge>
																	</TooltipTrigger>
																	<TooltipContent>
																		<p>Registro modificado después de su creación</p>
																	</TooltipContent>
																</Tooltip>
															{/if}
															{#if !entry.isManual && !entry.isModified}
																<span class="text-muted-foreground text-xs">-</span>
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

					<!-- Compliance Summary Card -->
					{#if calendarData && !loadingCalendar}
						<Card class="mt-6">
							<CardHeader>
								<CardTitle class="text-lg flex items-center gap-2">
									<span class="material-symbols-rounded">analytics</span>
									Resumen del período
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
									<div class="p-4 bg-muted rounded-lg text-center">
										<p class="text-2xl font-bold">{calendarData.summary.workingDays}</p>
										<p class="text-sm text-muted-foreground">Días laborables</p>
									</div>
									<div class="p-4 bg-success/10 rounded-lg text-center">
										<p class="text-2xl font-bold text-success">{calendarData.summary.daysWorked}</p>
										<p class="text-sm text-muted-foreground">Días trabajados</p>
									</div>
									{#if calendarData.summary.daysMissing > 0}
										<div class="p-4 bg-destructive/10 rounded-lg text-center">
											<p class="text-2xl font-bold text-destructive">
												{calendarData.summary.daysMissing}
											</p>
											<p class="text-sm text-muted-foreground">Días sin registrar</p>
										</div>
									{/if}
									<div class="p-4 bg-primary/10 rounded-lg text-center">
										<p class="text-2xl font-bold">{calendarData.summary.compliancePercentage}%</p>
										<p class="text-sm text-muted-foreground">Cumplimiento</p>
									</div>
								</div>
							</CardContent>
						</Card>
					{/if}
				</TabsContent>
			</Tabs>
		{/if}
	</div>

	<CalendarDayDetail bind:open={dayDetailOpen} day={selectedDay} onClose={handleDayDetailClose} />
{/if}

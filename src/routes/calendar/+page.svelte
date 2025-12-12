<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import WorkingCalendar from './WorkingCalendar.svelte';
	import CalendarDayDetail from './CalendarDayDetail.svelte';
	import TimeEntryFormModal from '$lib/components/TimeEntryFormModal.svelte';
	import { fetchMyCalendar, type CalendarDay, type CalendarResponse } from '$lib/api/calendar';
	import { fetchProjects, type Project } from '$lib/api/projects';
	import { fetchTimeEntryTypes, type TimeEntryType } from '$lib/api/time-entries';

	let calendarData = $state<CalendarResponse | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let currentMonth = $state(new Date());
	let selectedDay = $state<CalendarDay | null>(null);
	let dayDetailOpen = $state(false);

	// For time entry modal
	let projects = $state<Project[]>([]);
	let timeEntryTypes = $state<TimeEntryType[]>([]);
	let timeEntryModalOpen = $state(false);
	let loadingProjects = $state(true);
	let loadingTypes = $state(true);

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

		// Expand to cover the full weeks visible in a typical month grid (Mon..Sun).
		// JS Date#getDay(): 0=Sun .. 6=Sat. Convert to Monday-based index: 0=Mon .. 6=Sun.
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

	async function loadCalendar() {
		loading = true;
		error = null;
		try {
			const { from, to } = getMonthRange(currentMonth);
			calendarData = await fetchMyCalendar(from, to);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar el calendario';
		} finally {
			loading = false;
		}
	}

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

	function handleAddEntry() {
		dayDetailOpen = false;
		timeEntryModalOpen = true;
	}

	function handleEntrySuccess() {
		loadCalendar();
	}

	function handleTimeEntryModalClose() {
		// Nothing specific needed
	}

	// Reload calendar when month changes
	$effect(() => {
		loadCalendar();
	});

	onMount(() => {
		loadProjects();
		loadTypes();
	});
</script>

<div class="grow flex flex-col gap-6 p-6">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<Button variant="ghost" size="sm" onclick={() => goto(resolve('/'))}>
				<span class="material-symbols-rounded text-lg!">arrow_back</span>
			</Button>
			<h1 class="text-2xl font-semibold tracking-tight flex items-center gap-2">
				<span class="material-symbols-rounded text-3xl!">calendar_month</span>
				Calendario Laboral
			</h1>
		</div>
		<Button href={resolve('/absences')}>
			<span class="material-symbols-rounded text-lg! mr-2">beach_access</span>
			Mis Ausencias
		</Button>
	</div>

	<Card class="w-full max-w-5xl mx-auto">
		<CardHeader>
			<CardTitle class="sr-only">Calendario del mes</CardTitle>
		</CardHeader>
		<CardContent>
			{#if loading}
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
			{:else if error}
				<div class="flex flex-col items-center justify-center py-12 text-destructive">
					<span class="material-symbols-rounded text-4xl! mb-2">error</span>
					<p>{error}</p>
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
	{#if calendarData && !loading}
		<Card class="w-full max-w-5xl mx-auto">
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
							<p class="text-2xl font-bold text-destructive">{calendarData.summary.daysMissing}</p>
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
</div>

<CalendarDayDetail
	bind:open={dayDetailOpen}
	day={selectedDay}
	onClose={handleDayDetailClose}
	onAddEntry={handleAddEntry}
/>

<TimeEntryFormModal
	bind:open={timeEntryModalOpen}
	entry={null}
	{projects}
	{timeEntryTypes}
	latestProjectId={null}
	onClose={handleTimeEntryModalClose}
	onSuccess={handleEntrySuccess}
/>

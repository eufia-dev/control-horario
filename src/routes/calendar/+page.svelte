<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import WorkingCalendar from './WorkingCalendar.svelte';
	import CalendarDayDetail from './CalendarDayDetail.svelte';
	import TimeEntryFormModal from '$lib/components/TimeEntryFormModal.svelte';
	import {
		fetchMyCalendarMonth,
		type CalendarDay,
		type CalendarMonthResponse
	} from '$lib/api/calendar';
	import { fetchProjects, type Project } from '$lib/api/projects';
	import { fetchTimeEntryTypes, type TimeEntryType } from '$lib/api/time-entries';
	import { isGuest as isGuestStore } from '$lib/stores/auth';

	let isGuest = $state(false);

	$effect(() => {
		const unsub = isGuestStore.subscribe((value) => {
			isGuest = value;
		});
		return unsub;
	});

	// Redirect GUEST users to home - they cannot access personal calendar
	$effect(() => {
		if (browser && isGuest) {
			goto(resolve('/'));
		}
	});

	let calendarData = $state<CalendarMonthResponse | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let currentMonth = $state(new Date());
	let selectedDay = $state<CalendarDay | null>(null);
	let dayDetailOpen = $state(false);

	// For time entry modal
	let projects = $state<Project[]>([]);
	let timeEntryTypes = $state<TimeEntryType[]>([]);
	let timeEntryModalOpen = $state(false);
	let initialDateForModal = $state<string | null>(null);

	async function loadCalendar() {
		loading = true;
		error = null;
		try {
			const year = currentMonth.getFullYear();
			const month = currentMonth.getMonth(); // 0-indexed
			calendarData = await fetchMyCalendarMonth(year, month);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar el calendario';
		} finally {
			loading = false;
		}
	}

	async function loadProjects() {
		try {
			projects = await fetchProjects();
		} catch (e) {
			console.error('Error loading projects:', e);
		}
	}

	async function loadTypes() {
		try {
			timeEntryTypes = await fetchTimeEntryTypes();
		} catch (e) {
			console.error('Error loading time entry types:', e);
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
		// Store the selected day's date to pass to the modal
		initialDateForModal = selectedDay?.date ?? null;
		timeEntryModalOpen = true;
	}

	function handleEntrySuccess() {
		loadCalendar();
	}

	function handleTimeEntryModalClose() {
		// Clear the initial date when modal closes
		initialDateForModal = null;
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
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

	<Card class="w-full max-w-6xl mx-auto">
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
	initialDate={initialDateForModal}
	onClose={handleTimeEntryModalClose}
	onSuccess={handleEntrySuccess}
/>

<script lang="ts">
	import { page } from '$app/stores';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Button } from '$lib/components/ui/button';
	import WorkingCalendar from '../../../../../calendar/WorkingCalendar.svelte';
	import CalendarDayDetail from '../../../../../calendar/CalendarDayDetail.svelte';
	import {
		fetchCalendarMonth,
		type CalendarDay,
		type CalendarMonthResponse
	} from '$lib/api/calendar';

	// Get userId from route params
	let userId = $derived($page.params.userId);

	// Calendar data
	let calendarData = $state<CalendarMonthResponse | null>(null);
	let loadingCalendar = $state(true);
	let calendarError = $state<string | null>(null);
	let currentMonth = $state(new Date());
	let selectedDay = $state<CalendarDay | null>(null);
	let dayDetailOpen = $state(false);

	async function loadCalendar() {
		loadingCalendar = true;
		calendarError = null;
		try {
			if (!userId) return;
			const year = currentMonth.getFullYear();
			const month = currentMonth.getMonth();
			calendarData = await fetchCalendarMonth(year, month, userId);
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

	// Reload calendar when month changes
	$effect(() => {
		if (userId) {
			loadCalendar();
		}
	});
</script>

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

<CalendarDayDetail bind:open={dayDetailOpen} day={selectedDay} onClose={handleDayDetailClose} />

<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import {
		DAY_NAMES,
		isValidTimeFormat,
		isEndTimeAfterStartTime,
		isBreakWithinWorkHours,
		type WorkScheduleDay
	} from '$lib/api/work-schedules';

	type DayState = {
		enabled: boolean;
		startTime: string;
		endTime: string;
		hasBreak: boolean;
		breakStartTime: string;
		breakEndTime: string;
	};

	type Props = {
		schedule: WorkScheduleDay[];
		disabled?: boolean;
		readonly?: boolean;
		onchange?: (schedule: WorkScheduleDay[]) => void;
	};

	let { schedule = $bindable(), disabled = false, readonly = false, onchange }: Props = $props();

	// Helper to check if a time is a valid working time (not the "00:00" placeholder)
	function isValidWorkingTime(time: string | undefined): boolean {
		return !!time && time !== '00:00';
	}

	// Internal state for all 7 days
	let days = $state<DayState[]>(
		Array.from({ length: 7 }, (_, i) => {
			const existing = schedule.find((d) => d.dayOfWeek === i);
			// Day is enabled only if it exists in the schedule AND isWorkable is not false
			const isWorkable = existing ? existing.isWorkable !== false : false;
			const hasBreak = !!(existing?.breakStartTime && existing?.breakEndTime);
			// Use existing times only if workable and valid, otherwise use defaults
			const useExistingTimes = isWorkable && isValidWorkingTime(existing?.startTime);
			return {
				enabled: isWorkable,
				startTime: useExistingTimes ? existing!.startTime : '09:00',
				endTime: useExistingTimes ? existing!.endTime : '17:00',
				hasBreak,
				breakStartTime: existing?.breakStartTime ?? '13:00',
				breakEndTime: existing?.breakEndTime ?? '14:00'
			};
		})
	);

	// Sync internal state when schedule prop changes from outside
	$effect(() => {
		const newDays = Array.from({ length: 7 }, (_, i) => {
			const existing = schedule.find((d) => d.dayOfWeek === i);
			// Day is enabled only if it exists in the schedule AND isWorkable is not false
			const isWorkable = existing ? existing.isWorkable !== false : false;
			const hasBreak = !!(existing?.breakStartTime && existing?.breakEndTime);
			// Use existing times only if workable and valid, otherwise use defaults
			const useExistingTimes = isWorkable && isValidWorkingTime(existing?.startTime);
			return {
				enabled: isWorkable,
				startTime: useExistingTimes ? existing!.startTime : '09:00',
				endTime: useExistingTimes ? existing!.endTime : '17:00',
				hasBreak,
				breakStartTime: existing?.breakStartTime ?? '13:00',
				breakEndTime: existing?.breakEndTime ?? '14:00'
			};
		});
		// Only update if there's an actual change to avoid infinite loops
		const hasChanged = newDays.some(
			(d, i) =>
				d.enabled !== days[i].enabled ||
				d.startTime !== days[i].startTime ||
				d.endTime !== days[i].endTime ||
				d.hasBreak !== days[i].hasBreak ||
				d.breakStartTime !== days[i].breakStartTime ||
				d.breakEndTime !== days[i].breakEndTime
		);
		if (hasChanged) {
			days = newDays;
		}
	});

	// Helper to convert time string to minutes
	function timeToMinutes(time: string): number {
		const [hour, min] = time.split(':').map(Number);
		return hour * 60 + min;
	}

	// Calculate total weekly hours
	const totalWeeklyHours = $derived(() => {
		let totalMinutes = 0;
		for (const day of days) {
			if (!day.enabled) continue;
			if (!isValidTimeFormat(day.startTime) || !isValidTimeFormat(day.endTime)) continue;

			const workMinutes = timeToMinutes(day.endTime) - timeToMinutes(day.startTime);

			let breakMinutes = 0;
			if (
				day.hasBreak &&
				isValidTimeFormat(day.breakStartTime) &&
				isValidTimeFormat(day.breakEndTime)
			) {
				breakMinutes = timeToMinutes(day.breakEndTime) - timeToMinutes(day.breakStartTime);
			}

			totalMinutes += Math.max(0, workMinutes - breakMinutes);
		}
		const hours = Math.floor(totalMinutes / 60);
		const minutes = totalMinutes % 60;
		return { hours, minutes, totalMinutes };
	});

	// Validation errors per day
	const errors = $derived(
		days.map((day) => {
			if (!day.enabled) return null;
			if (!isValidTimeFormat(day.startTime)) {
				return 'Hora de inicio inválida';
			}
			if (!isValidTimeFormat(day.endTime)) {
				return 'Hora de fin inválida';
			}
			if (!isEndTimeAfterStartTime(day.startTime, day.endTime)) {
				return 'La hora de fin debe ser posterior a la de inicio';
			}
			// Break validation
			if (day.hasBreak) {
				if (!isValidTimeFormat(day.breakStartTime)) {
					return 'Hora de inicio de descanso inválida';
				}
				if (!isValidTimeFormat(day.breakEndTime)) {
					return 'Hora de fin de descanso inválida';
				}
				if (!isEndTimeAfterStartTime(day.breakStartTime, day.breakEndTime)) {
					return 'La hora de fin del descanso debe ser posterior a la de inicio';
				}
				if (
					!isBreakWithinWorkHours(day.startTime, day.endTime, day.breakStartTime, day.breakEndTime)
				) {
					return 'El descanso debe estar dentro del horario laboral';
				}
			}
			return null;
		})
	);

	function buildSchedule(): WorkScheduleDay[] {
		return days.map((day, i) => {
			if (!day.enabled) {
				// Non-working day - send isWorkable: false, no times needed
				return { dayOfWeek: i, isWorkable: false } as WorkScheduleDay;
			}
			// Working day
			const result: WorkScheduleDay = {
				dayOfWeek: i,
				isWorkable: true,
				startTime: day.startTime,
				endTime: day.endTime
			};
			if (day.hasBreak) {
				result.breakStartTime = day.breakStartTime;
				result.breakEndTime = day.breakEndTime;
			}
			return result;
		});
	}

	function handleDayChange() {
		const newSchedule = buildSchedule();
		schedule = newSchedule;
		onchange?.(newSchedule);
	}

	function toggleDay(index: number, enabled: boolean) {
		days[index].enabled = enabled;
		handleDayChange();
	}

	function updateStartTime(index: number, value: string) {
		days[index].startTime = value;
		handleDayChange();
	}

	function updateEndTime(index: number, value: string) {
		days[index].endTime = value;
		handleDayChange();
	}

	function toggleBreak(index: number, hasBreak: boolean) {
		days[index].hasBreak = hasBreak;
		handleDayChange();
	}

	function updateBreakStartTime(index: number, value: string) {
		days[index].breakStartTime = value;
		handleDayChange();
	}

	function updateBreakEndTime(index: number, value: string) {
		days[index].breakEndTime = value;
		handleDayChange();
	}
</script>

<div class="space-y-3">
	<!-- Total weekly hours summary -->
	<div
		class="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg"
	>
		<div class="flex items-center gap-2 text-sm font-medium">
			<span class="material-symbols-rounded text-primary">schedule</span>
			<span>Total horas semanales</span>
		</div>
		<div class="text-lg font-semibold text-primary">
			{totalWeeklyHours().hours}h {totalWeeklyHours().minutes > 0
				? `${totalWeeklyHours().minutes}min`
				: ''}
		</div>
	</div>

	{#each days as day, i (i)}
		<div
			class="w-full flex flex-col gap-3 p-3 border rounded-lg transition-colors {day.enabled
				? 'bg-background'
				: 'bg-muted/30'}"
		>
			<div class="flex items-start gap-4">
				<!-- Switches column -->
				<div class="flex flex-col gap-2 w-28 shrink-0">
					<!-- Day toggle -->
					<div class="flex items-center gap-2 h-9">
						<Switch
							id="day-{i}"
							checked={day.enabled}
							onCheckedChange={(checked) => toggleDay(i, checked)}
							disabled={disabled || readonly}
						/>
						<Label
							for="day-{i}"
							class="cursor-pointer font-medium {!day.enabled ? 'text-muted-foreground' : ''}"
						>
							{DAY_NAMES[i]}
						</Label>
					</div>

					{#if day.enabled}
						<!-- Break toggle -->
						<div class="flex items-center gap-2 h-9">
							<Switch
								id="break-{i}"
								checked={day.hasBreak}
								onCheckedChange={(checked) => toggleBreak(i, checked)}
								disabled={disabled || readonly}
								class="scale-90"
							/>
							<Label
								for="break-{i}"
								class="cursor-pointer text-sm {!day.hasBreak ? 'text-muted-foreground' : ''}"
							>
								Descanso
							</Label>
						</div>
					{/if}
				</div>

				{#if day.enabled}
					<!-- Time inputs column -->
					<div class="flex flex-col gap-2">
						<!-- Work hours row -->
						<div class="flex items-center gap-2 h-9">
							<Input
								id="start-{i}"
								type="time"
								value={day.startTime}
								oninput={(e) => updateStartTime(i, e.currentTarget.value)}
								disabled={disabled || readonly}
							/>
							<span class="text-muted-foreground">–</span>
							<Input
								id="end-{i}"
								type="time"
								value={day.endTime}
								oninput={(e) => updateEndTime(i, e.currentTarget.value)}
								disabled={disabled || readonly}
							/>
						</div>

						<!-- Break row -->
						<div class="flex items-center gap-2 h-9 {!day.hasBreak ? 'opacity-50' : ''} transition-opacity">
							<Input
								id="break-start-{i}"
								type="time"
								value={day.breakStartTime}
								oninput={(e) => updateBreakStartTime(i, e.currentTarget.value)}
								disabled={disabled || readonly || !day.hasBreak}
							/>
							<span class="text-muted-foreground">–</span>
							<Input
								id="break-end-{i}"
								type="time"
								value={day.breakEndTime}
								oninput={(e) => updateBreakEndTime(i, e.currentTarget.value)}
								disabled={disabled || readonly || !day.hasBreak}
							/>
						</div>
					</div>
				{:else}
					<div class="text-sm text-muted-foreground italic h-9 flex items-center">No laborable</div>
				{/if}
			</div>

			{#if errors[i]}
				<div class="text-sm text-destructive flex items-center gap-1 ml-32">
					<span class="material-symbols-rounded text-base">error</span>
					{errors[i]}
				</div>
			{/if}
		</div>
	{/each}
</div>

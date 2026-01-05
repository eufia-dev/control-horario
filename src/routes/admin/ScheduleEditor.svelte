<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
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

	// Internal state for all 7 days
	let days = $state<DayState[]>(
		Array.from({ length: 7 }, (_, i) => {
			const existing = schedule.find((d) => d.dayOfWeek === i);
			const hasBreak = !!(existing?.breakStartTime && existing?.breakEndTime);
			return {
				enabled: !!existing,
				startTime: existing?.startTime ?? '09:00',
				endTime: existing?.endTime ?? '17:00',
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
			const hasBreak = !!(existing?.breakStartTime && existing?.breakEndTime);
			return {
				enabled: !!existing,
				startTime: existing?.startTime ?? '09:00',
				endTime: existing?.endTime ?? '17:00',
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
					!isBreakWithinWorkHours(
						day.startTime,
						day.endTime,
						day.breakStartTime,
						day.breakEndTime
					)
				) {
					return 'El descanso debe estar dentro del horario laboral';
				}
			}
			return null;
		})
	);

	function buildSchedule(): WorkScheduleDay[] {
		return days
			.map((day, i) => {
				const base: WorkScheduleDay & { enabled: boolean } = {
					dayOfWeek: i,
					startTime: day.startTime,
					endTime: day.endTime,
					enabled: day.enabled
				};
				if (day.hasBreak) {
					base.breakStartTime = day.breakStartTime;
					base.breakEndTime = day.breakEndTime;
				}
				return base;
			})
			.filter((d) => d.enabled)
			.map(({ dayOfWeek, startTime, endTime, breakStartTime, breakEndTime }) => {
				const result: WorkScheduleDay = { dayOfWeek, startTime, endTime };
				if (breakStartTime && breakEndTime) {
					result.breakStartTime = breakStartTime;
					result.breakEndTime = breakEndTime;
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

	function toggleBreak(index: number) {
		days[index].hasBreak = !days[index].hasBreak;
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
	<div class="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
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
			<div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
				<div class="flex items-center gap-2 w-28 shrink-0">
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
					<div class="flex items-center gap-2 flex-wrap">
						<div class="flex flex-col sm:flex-row items-center gap-2">
							<Label for="start-{i}" class="text-sm text-muted-foreground whitespace-nowrap">
								Inicio
							</Label>
							<Input
								id="start-{i}"
								type="time"
								value={day.startTime}
								oninput={(e) => updateStartTime(i, e.currentTarget.value)}
								disabled={disabled || readonly}
							/>
						</div>
						<span class="text-muted-foreground">–</span>
						<div class="flex flex-col sm:flex-row items-center gap-2">
							<Label for="end-{i}" class="text-sm text-muted-foreground whitespace-nowrap"
								>Fin</Label
							>
							<Input
								id="end-{i}"
								type="time"
								value={day.endTime}
								oninput={(e) => updateEndTime(i, e.currentTarget.value)}
								disabled={disabled || readonly}
							/>
						</div>
					</div>
				{:else}
					<div class="text-sm text-muted-foreground italic">No laborable</div>
				{/if}
			</div>

			{#if day.enabled}
				<!-- Break section -->
				<div class="flex flex-col sm:flex-row items-start gap-3 sm:gap-6 pl-0">
					<Button
						variant="ghost"
						size="sm"
						class="h-8 px-2 text-muted-foreground hover:text-foreground {day.hasBreak
							? 'text-foreground'
							: ''}"
						onclick={() => toggleBreak(i)}
						disabled={disabled || readonly}
					>
						<span class="material-symbols-rounded text-lg! mr-1">
							{day.hasBreak ? 'check_box' : 'check_box_outline_blank'}
						</span>
						Descanso
					</Button>

					{#if day.hasBreak}
						<div class="flex items-center gap-2 flex-wrap">
							<div class="flex flex-col sm:flex-row items-center gap-2">
								<Label
									for="break-start-{i}"
									class="text-sm text-muted-foreground whitespace-nowrap"
								>
									Desde
								</Label>
								<Input
									id="break-start-{i}"
									type="time"
									value={day.breakStartTime}
									oninput={(e) => updateBreakStartTime(i, e.currentTarget.value)}
									disabled={disabled || readonly}
								/>
							</div>
							<span class="text-muted-foreground">–</span>
							<div class="flex flex-col sm:flex-row items-center gap-2">
								<Label for="break-end-{i}" class="text-sm text-muted-foreground whitespace-nowrap"
									>Hasta</Label
								>
								<Input
									id="break-end-{i}"
									type="time"
									value={day.breakEndTime}
									oninput={(e) => updateBreakEndTime(i, e.currentTarget.value)}
									disabled={disabled || readonly}
								/>
							</div>
						</div>
					{/if}
				</div>

				{#if errors[i]}
					<div class="text-sm text-destructive flex items-center gap-1 pl-0 sm:pl-[7.5rem]">
						<span class="material-symbols-rounded text-base">error</span>
						{errors[i]}
					</div>
				{/if}
			{/if}
		</div>
	{/each}
</div>

<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import {
		DAY_NAMES,
		isValidTimeFormat,
		isEndTimeAfterStartTime,
		type WorkScheduleDay
	} from '$lib/api/work-schedules';

	type DayState = {
		enabled: boolean;
		startTime: string;
		endTime: string;
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
			return {
				enabled: !!existing,
				startTime: existing?.startTime ?? '09:00',
				endTime: existing?.endTime ?? '17:00'
			};
		})
	);

	// Sync internal state when schedule prop changes from outside
	$effect(() => {
		const newDays = Array.from({ length: 7 }, (_, i) => {
			const existing = schedule.find((d) => d.dayOfWeek === i);
			return {
				enabled: !!existing,
				startTime: existing?.startTime ?? '09:00',
				endTime: existing?.endTime ?? '17:00'
			};
		});
		// Only update if there's an actual change to avoid infinite loops
		const hasChanged = newDays.some(
			(d, i) =>
				d.enabled !== days[i].enabled ||
				d.startTime !== days[i].startTime ||
				d.endTime !== days[i].endTime
		);
		if (hasChanged) {
			days = newDays;
		}
	});

	// Validation errors per day
	const errors = $derived(
		days.map((day, i) => {
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
			return null;
		})
	);

	function buildSchedule(): WorkScheduleDay[] {
		return days
			.map((day, i) => ({
				dayOfWeek: i,
				startTime: day.startTime,
				endTime: day.endTime,
				enabled: day.enabled
			}))
			.filter((d) => d.enabled)
			.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }));
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
</script>

<div class="space-y-3">
	{#each days as day, i (i)}
		<div
			class="w-full flex flex-col sm:flex-row items-center gap-6 p-3 border rounded-lg transition-colors {day.enabled
				? 'bg-background'
				: 'bg-muted/30'}"
		>
			<div class="flex items-center gap-2 w-28">
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
				<div class="flex items-center gap-2">
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
						<Label for="end-{i}" class="text-sm text-muted-foreground whitespace-nowrap">Fin</Label>
						<Input
							id="end-{i}"
							type="time"
							value={day.endTime}
							oninput={(e) => updateEndTime(i, e.currentTarget.value)}
							disabled={disabled || readonly}
						/>
					</div>
				</div>
				{#if errors[i]}
					<div class="text-sm text-destructive flex items-center gap-1">
						<span class="material-symbols-rounded text-base">error</span>
						{errors[i]}
					</div>
				{/if}
			{:else}
				<div class="text-sm text-muted-foreground italic">No laborable</div>
			{/if}
		</div>
	{/each}
</div>


<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Tooltip,
		TooltipContent,
		TooltipProvider,
		TooltipTrigger
	} from '$lib/components/ui/tooltip';
	import type { CalendarDay, CalendarSummary, DayStatus } from '$lib/api/calendar';
	import { DAY_STATUS_STYLES, DAY_STATUS_LABELS, ABSENCE_TYPE_LABELS } from '$lib/types/calendar';

	type Props = {
		days: CalendarDay[];
		summary: CalendarSummary;
		currentMonth: Date;
		onPrevMonth: () => void;
		onNextMonth: () => void;
		onDayClick: (day: CalendarDay) => void;
	};

	let { days, summary, currentMonth, onPrevMonth, onNextMonth, onDayClick }: Props = $props();

	const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

	const monthName = $derived(
		currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
	);

	function formatLocalDateKey(date: Date): string {
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, '0');
		const d = String(date.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}

	function parseDateKey(dateKey: string): Date {
		const [y, m, d] = dateKey.split('-').map(Number);
		return new Date(y, (m ?? 1) - 1, d ?? 1);
	}

	function getVisibleRangeForMonth(month: Date): { start: Date; end: Date } {
		const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
		const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);

		// Monday-based index: 0=Mon .. 6=Sun
		const firstDowMon0 = (firstDay.getDay() + 6) % 7;
		const start = new Date(firstDay);
		start.setDate(firstDay.getDate() - firstDowMon0);

		const lastDowMon0 = (lastDay.getDay() + 6) % 7;
		const end = new Date(lastDay);
		end.setDate(lastDay.getDate() + (6 - lastDowMon0));

		return { start, end };
	}

	// Build grid weeks for the full visible range (Mon..Sun), filling from API days when present.
	const weeksInMonth = $derived.by(() => {
		const dayByDate = new Map<string, CalendarDay>();
		for (const day of days) dayByDate.set(day.date, day);

		const { start, end } = getVisibleRangeForMonth(currentMonth);

		const weeks: (CalendarDay | null)[][] = [];
		let currentWeek: (CalendarDay | null)[] = [];

		const cursor = new Date(start);
		while (cursor <= end) {
			const key = formatLocalDateKey(cursor);
			currentWeek.push(dayByDate.get(key) ?? null);

			if (currentWeek.length === 7) {
				weeks.push(currentWeek);
				currentWeek = [];
			}

			cursor.setDate(cursor.getDate() + 1);
		}

		return weeks;
	});

	function getDayStyles(status: DayStatus) {
		return DAY_STATUS_STYLES[status] || DAY_STATUS_STYLES.FUTURE;
	}

	function formatMinutes(minutes: number): string {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 0) {
			return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
		}
		return `${mins}m`;
	}

	function getDayNumber(dateString: string): number {
		return parseDateKey(dateString).getDate();
	}

	function getDayLabel(day: CalendarDay): string {
		if (day.holidayName) return day.holidayName;
		if (day.absenceType) return ABSENCE_TYPE_LABELS[day.absenceType] || day.absenceType;
		if (day.status === 'WORKED' || day.status === 'PARTIALLY_WORKED') {
			return formatMinutes(day.loggedMinutes);
		}
		if (day.status === 'MISSING_LOGS') return 'Sin registrar';
		return '';
	}
</script>

<div class="space-y-4">
	<!-- Month Navigation -->
	<div class="flex items-center justify-between">
		<Button variant="outline" size="sm" onclick={onPrevMonth}>
			<span class="material-symbols-rounded text-lg!">chevron_left</span>
		</Button>
		<h2 class="text-lg font-semibold capitalize">{monthName}</h2>
		<Button variant="outline" size="sm" onclick={onNextMonth}>
			<span class="material-symbols-rounded text-lg!">chevron_right</span>
		</Button>
	</div>

	<!-- Summary Bar -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/50 rounded-lg text-sm gap-4">
		<div class="flex items-center gap-4 flex-wrap">
			<div class="flex items-center gap-1.5">
				<span class="material-symbols-rounded text-success text-lg!">check_circle</span>
				<span>{summary.daysWorked} trabajados</span>
			</div>
			{#if summary.daysMissing > 0}
				<div class="flex items-center gap-1.5">
					<span class="material-symbols-rounded text-destructive text-lg!">error</span>
					<span class="text-destructive font-medium">{summary.daysMissing} sin registrar</span>
				</div>
			{/if}
			<div class="flex items-center gap-1.5">
				<span class="material-symbols-rounded text-blue-500 text-lg!">event</span>
				<span>{summary.publicHolidays} festivos</span>
			</div>
			{#if summary.absenceDays > 0}
				<div class="flex items-center gap-1.5">
					<span class="material-symbols-rounded text-purple-500 text-lg!">beach_access</span>
					<span>{summary.absenceDays} ausencias</span>
				</div>
			{/if}
		</div>
		<Badge
			variant={summary.compliancePercentage >= 80
				? 'success'
				: summary.compliancePercentage >= 50
					? 'secondary'
					: 'destructive'}
			class="text-sm px-3 py-1"
		>
			{summary.compliancePercentage}% cumplimiento
		</Badge>
	</div>

	<!-- Calendar Grid -->
	<TooltipProvider>
		<div class="border rounded-lg overflow-hidden">
			<!-- Header -->
			<div class="grid grid-cols-7 bg-muted">
				{#each weekDays as day (day)}
					<div class="p-2 text-center text-sm font-medium text-muted-foreground">
						{day}
					</div>
				{/each}
			</div>

			<!-- Weeks -->
			{#each weeksInMonth as week, weekIndex (weekIndex)}
				<div class="grid grid-cols-7 border-t">
					{#each week as day, dayIndex (day ? day.date : `empty-${weekIndex}-${dayIndex}`)}
						{#if day}
							{@const styles = getDayStyles(day.status)}
							{@const dayDate = parseDateKey(day.date)}
							{@const isOutsideMonth =
								dayDate.getMonth() !== currentMonth.getMonth() ||
								dayDate.getFullYear() !== currentMonth.getFullYear()}
							{@const dayLabel = getDayLabel(day)}
							<Tooltip>
								<TooltipTrigger>
									<button
										type="button"
										class="w-full p-2 min-h-[72px] flex flex-col items-center justify-start gap-1 transition-colors hover:bg-accent/50 {styles.bgClass} {isOutsideMonth ? 'opacity-60' : ''}"
										onclick={() => onDayClick(day)}
									>
										<span class="text-sm font-medium {styles.textClass}">
											{getDayNumber(day.date)}
										</span>
										{#if dayLabel}
											<span class="text-xs truncate max-w-full px-1 {styles.textClass}">
												{dayLabel}
											</span>
										{/if}
										{#if day.isOvertime}
											<span class="material-symbols-rounded text-yellow-500 text-sm!">
												schedule
											</span>
										{/if}
									</button>
								</TooltipTrigger>
								<TooltipContent side="top">
									<div class="text-sm">
										<p class="font-medium">{DAY_STATUS_LABELS[day.status]}</p>
										{#if day.holidayName}
											<p>{day.holidayName}</p>
										{/if}
										{#if day.absenceType}
											<p>{ABSENCE_TYPE_LABELS[day.absenceType]}</p>
										{/if}
										{#if day.expectedMinutes > 0}
											<p>Esperado: {formatMinutes(day.expectedMinutes)}</p>
										{/if}
										{#if day.loggedMinutes > 0}
											<p>Registrado: {formatMinutes(day.loggedMinutes)}</p>
										{/if}
										{#if day.isOvertime}
											<p class="text-yellow-500">Horas extra</p>
										{/if}
									</div>
								</TooltipContent>
							</Tooltip>
						{:else}
							<div class="p-2 min-h-[72px] bg-muted/30"></div>
						{/if}
					{/each}
				</div>
			{/each}
		</div>
	</TooltipProvider>

	<!-- Legend -->
	<div class="flex flex-wrap gap-4 text-xs text-muted-foreground">
		<div class="flex items-center gap-1.5">
			<div class="w-3 h-3 rounded bg-success/20"></div>
			<span>Trabajado</span>
		</div>
		<div class="flex items-center gap-1.5">
			<div class="w-3 h-3 rounded bg-yellow-500/20"></div>
			<span>Parcial</span>
		</div>
		<div class="flex items-center gap-1.5">
			<div class="w-3 h-3 rounded bg-destructive/20"></div>
			<span>Sin registrar</span>
		</div>
		<div class="flex items-center gap-1.5">
			<div class="w-3 h-3 rounded bg-blue-500/20"></div>
			<span>Festivo</span>
		</div>
		<div class="flex items-center gap-1.5">
			<div class="w-3 h-3 rounded bg-purple-500/20"></div>
			<span>Ausencia</span>
		</div>
		<div class="flex items-center gap-1.5">
			<div class="w-3 h-3 rounded bg-muted"></div>
			<span>No laborable</span>
		</div>
	</div>
</div>

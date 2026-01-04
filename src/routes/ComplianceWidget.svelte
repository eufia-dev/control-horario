<script lang="ts">
	import { Card, CardHeader, CardTitle, CardContent, CardAction } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { resolve } from '$app/paths';
	import type { CalendarSummary } from '$lib/api/calendar';

	type Props = {
		summary: CalendarSummary | null;
		loading?: boolean;
	};

	let { summary, loading = false }: Props = $props();

	function formatMinutes(minutes: number): string {
		const absMinutes = Math.abs(minutes);
		const hours = Math.floor(absMinutes / 60);
		const mins = absMinutes % 60;
		if (hours > 0) {
			return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
		}
		return `${mins}m`;
	}

	// Use compliancePercentage from backend
	const isOvertime = $derived(summary ? summary.compliancePercentage > 100 : false);

	// For overtime: show base 100% in success, and overflow portion with accent
	const baseWidth = $derived.by(() => {
		if (!summary) return '0%';
		return isOvertime ? '100%' : `${summary.compliancePercentage}%`;
	});
	const overtimeWidth = $derived.by(() => {
		if (!summary || !isOvertime) return '0%';
		return `${Math.min(50, summary.compliancePercentage - 100)}%`;
	});

	const progressColor = $derived.by(() => {
		if (!summary) return 'bg-muted';
		if (summary.compliancePercentage >= 100) return 'bg-success';
		if (summary.compliancePercentage >= 80) return 'bg-yellow-500';
		return 'bg-destructive';
	});

	// Difference styling
	const differenceColor = $derived.by(() => {
		if (!summary) return 'text-muted-foreground';
		if (summary.minutesDifference > 0) return 'text-success';
		if (summary.minutesDifference < 0) return 'text-destructive';
		return 'text-muted-foreground';
	});

	const differenceIcon = $derived.by(() => {
		if (!summary) return 'schedule';
		if (summary.minutesDifference > 0) return 'trending_up';
		if (summary.minutesDifference < 0) return 'trending_down';
		return 'check_circle';
	});

	const differenceLabel = $derived.by(() => {
		if (!summary) return '';
		if (summary.minutesDifference > 0) return `+${formatMinutes(summary.minutesDifference)} extra`;
		if (summary.minutesDifference < 0)
			return `-${formatMinutes(summary.minutesDifference)} pendientes`;
		return 'Al día';
	});
</script>

<Card class="w-full flex-1">
	<CardHeader class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
		<CardTitle class="text-sm font-medium flex items-center gap-2 text-muted-foreground">
			<span class="material-symbols-rounded text-lg!">schedule</span>
			Cumplimiento este mes
		</CardTitle>
		<CardAction>
			<Button variant="ghost" size="sm" href={resolve('/calendar')} title="Ver calendario">
				<span class="material-symbols-rounded text-lg!">calendar_month</span>
				Calendario
				<span class="material-symbols-rounded text-lg! ml-auto">chevron_right</span>
			</Button>
		</CardAction>
	</CardHeader>
	<CardContent>
		{#if loading}
			<div class="space-y-3 animate-pulse">
				<div class="h-8 bg-muted rounded w-32"></div>
				<div class="h-5 bg-muted rounded w-24"></div>
				<div class="h-2 bg-muted rounded w-full"></div>
			</div>
		{:else if summary}
			<div class="space-y-3">
				<div class="flex flex-col gap-1">
					<div class="flex items-baseline gap-2">
						<span class="text-3xl font-bold">
							{formatMinutes(summary.totalLoggedMinutes)}
						</span>
						<span class="text-sm text-muted-foreground">
							/ {formatMinutes(summary.totalExpectedMinutes)}
						</span>
					</div>
					<div class="flex items-center gap-1.5 {differenceColor}">
						<span class="material-symbols-rounded text-lg!">{differenceIcon}</span>
						<span class="text-sm font-medium">{differenceLabel}</span>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<div class="flex-1 h-2.5 bg-muted rounded-full overflow-hidden relative">
						<!-- Base progress bar -->
						<div
							class="h-full transition-all duration-500 {progressColor}"
							style="width: {baseWidth}"
						></div>
						<!-- Overtime glow effect when > 100% -->
						{#if isOvertime}
							<div
								class="absolute inset-0 bg-linear-to-r from-success via-emerald-400 to-success animate-pulse opacity-30"
							></div>
							<!-- Sparkle overlay for overtime -->
							<div
								class="absolute right-0 top-0 h-full flex items-center justify-end pr-1"
								style="width: {overtimeWidth}"
							>
								<span class="material-symbols-rounded text-white text-xs! drop-shadow-sm">
									auto_awesome
								</span>
							</div>
						{/if}
					</div>
					<span
						class="text-xs font-semibold min-w-14 text-right {isOvertime
							? 'text-success'
							: 'text-muted-foreground'}"
					>
						{summary.compliancePercentage}%
						{#if isOvertime}
							<span class="material-symbols-rounded text-xs! align-middle">bolt</span>
						{/if}
					</span>
				</div>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">No hay datos disponibles</p>
		{/if}
	</CardContent>
</Card>

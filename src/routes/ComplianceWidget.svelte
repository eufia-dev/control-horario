<script lang="ts">
	import { Card, CardHeader, CardTitle, CardContent, CardAction } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';
	import { resolve } from '$app/paths';
	import type { CalendarSummary } from '$lib/api/calendar';

	type Props = {
		summary: CalendarSummary | null;
		loading?: boolean;
		hasProjects?: boolean;
	};

	let { summary, loading = false, hasProjects = false }: Props = $props();

	const MAX_PROJECTS_SHOWN = 4;

	function formatMinutes(minutes: number): string {
		const absMinutes = Math.abs(minutes);
		const hours = Math.floor(absMinutes / 60);
		const mins = absMinutes % 60;
		if (hours > 0) {
			return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
		}
		return `${mins}m`;
	}

	function formatMinutesCompact(minutes: number): string {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 0) {
			return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
		}
		return `${mins}m`;
	}

	// Use compliancePercentage from backend
	const isOvertime = $derived(summary ? summary.compliancePercentage > 100 : false);

	// Bar width: cap at 100% for display
	const barWidth = $derived.by(() => {
		if (!summary) return '0%';
		return `${Math.min(summary.compliancePercentage, 100)}%`;
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

	// Project breakdown derived values
	const hasProjectBreakdown = $derived(
		summary?.projectBreakdown && summary.projectBreakdown.length > 0
	);

	const visibleProjects = $derived.by(() => {
		if (!summary?.projectBreakdown) return [];
		return summary.projectBreakdown.slice(0, MAX_PROJECTS_SHOWN);
	});

	const hiddenProjectsCount = $derived.by(() => {
		if (!summary?.projectBreakdown) return 0;
		return Math.max(0, summary.projectBreakdown.length - MAX_PROJECTS_SHOWN);
	});
</script>

<Card class="w-full flex-1">
	<CardHeader class="flex flex-row items-center justify-between gap-2">
		<CardTitle class="text-sm font-medium flex items-center gap-2 text-muted-foreground">
			<span class="material-symbols-rounded text-lg!">schedule</span>
			Cumplimiento este mes
		</CardTitle>
		<CardAction>
			<Button variant="ghost" size="sm" href={resolve('/calendar')} title="Ver calendario" class="sm:px-3">
				<span class="material-symbols-rounded text-lg!">calendar_month</span>
				<span class="hidden sm:inline">Calendario</span>
				<span class="material-symbols-rounded text-lg! ml-auto hidden sm:inline">chevron_right</span>
			</Button>
		</CardAction>
	</CardHeader>
	<CardContent>
		{#if loading}
			<div class="space-y-3 animate-pulse">
				<div class="h-8 bg-muted rounded w-32"></div>
				<div class="h-5 bg-muted rounded w-24"></div>
				<div class="h-2 bg-muted rounded w-full"></div>
				{#if hasProjects}
					<div class="pt-3 mt-1 border-t border-border/50">
						<div class="flex flex-wrap gap-2">
							<div class="h-8 bg-muted rounded-lg w-24"></div>
							<div class="h-8 bg-muted rounded-lg w-20"></div>
							<div class="h-8 bg-muted rounded-lg w-22"></div>
						</div>
					</div>
				{/if}
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
					<div class="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
						<div
							class="h-full transition-all duration-500 {progressColor}"
							style="width: {barWidth}"
						></div>
					</div>
					<span
						class="text-sm font-semibold min-w-12 text-right flex items-center gap-1 {isOvertime
							? 'text-success'
							: 'text-muted-foreground'}"
					>
						{#if isOvertime}
							<span class="material-symbols-rounded text-base!">bolt</span>
						{/if}
						{summary.compliancePercentage}%
					</span>
				</div>

				{#if hasProjectBreakdown}
					<div class="pt-3 mt-1 border-t border-border/50">
						<div class="flex flex-wrap items-center gap-2">
							{#each visibleProjects as project (project.projectId)}
								<Tooltip>
									<TooltipTrigger class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted transition-colors">
										<span class="text-sm font-bold">{project.projectCode}</span>
										<span class="text-sm text-muted-foreground">{formatMinutesCompact(project.minutesWorked)}</span>
									</TooltipTrigger>
									<TooltipContent>
										<p>{project.projectName}</p>
									</TooltipContent>
								</Tooltip>
							{/each}
							{#if hiddenProjectsCount > 0}
								<span class="inline-flex items-center px-3 py-1.5 text-sm text-muted-foreground">+{hiddenProjectsCount} más</span>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">No hay datos disponibles</p>
		{/if}
	</CardContent>
</Card>

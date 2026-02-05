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

	const MAX_PROJECTS_SHOWN = 5;

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

	const visibleProjects = $derived.by(() => {
		if (!summary?.projectBreakdown) return [];
		return summary.projectBreakdown.slice(0, MAX_PROJECTS_SHOWN);
	});
</script>

<Card class="w-full flex-1">
	<CardHeader class="flex flex-row items-center justify-between gap-2">
		<CardTitle class="text-2xl font-semibold tracking-tight flex items-center gap-2">
			<span class="material-symbols-rounded text-2xl!">schedule</span>
			Este mes
		</CardTitle>
		<CardAction>
			<Button variant="ghost" href={resolve('/calendar')} title="Ver calendario">
				<span class="material-symbols-rounded text-lg!">calendar_month</span>
				<span class="hidden sm:inline">Calendario</span>
				<span class="material-symbols-rounded text-lg! ml-auto hidden sm:inline">chevron_right</span
				>
			</Button>
		</CardAction>
	</CardHeader>
	<CardContent class="h-full">
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
			<div class="flex flex-col h-full gap-3">
				<div class="flex flex-col gap-2 h-full justify-between">
					<div class="flex items-baseline gap-2">
						<span class="text-3xl font-bold">
							{formatMinutes(summary.totalLoggedMinutes)}
						</span>
						<span class="text-sm text-muted-foreground">
							/ {formatMinutes(summary.totalExpectedMinutes)}
						</span>
					</div>

					<div class="flex flex-col gap-2">
						<div class="flex items-center gap-2 {differenceColor}">
							<span class="material-symbols-rounded text-lg!">{differenceIcon}</span>
							<span class="font-medium">{differenceLabel}</span>
						</div>

						<div class="flex items-center gap-2">
							<div class="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
								<div class="h-full {progressColor}" style="width: {barWidth}"></div>
							</div>
							<span
								class="text-sm font-semibold px-1 text-right flex items-center gap-1 {isOvertime
									? 'text-success'
									: 'text-muted-foreground'}"
							>
								{#if isOvertime}
									<span class="material-symbols-rounded text-base!">bolt</span>
								{/if}
								{summary.compliancePercentage}%
							</span>
						</div>
					</div>
				</div>

				{#if hasProjects}
					<div class="pt-3 border-t border-border/50">
						{#if visibleProjects.length > 0}
							<div class="flex items-center justify-start gap-2">
								{#each visibleProjects as project (project.projectId)}
									<Tooltip>
										<TooltipTrigger
											class="flex-1 flex flex-col items-center gap-0.5 py-2 px-3 rounded-md bg-muted/50 hover:bg-muted transition-colors"
										>
											<span class="w-full text-sm text-center truncate">{project.projectCode}</span>
											<span class="text-sm text-muted-foreground whitespace-nowrap"
												>{formatMinutesCompact(project.minutesWorked)}</span
											>
										</TooltipTrigger>
										<TooltipContent>
											<p>{project.projectName}</p>
										</TooltipContent>
									</Tooltip>
								{/each}
							</div>
						{:else}
							<p class="text-sm text-muted-foreground mb-2">
								No hay horas registradas para este mes.
							</p>
							<p class="text-sm text-muted-foreground">¡Es momento de empezar a trabajar!</p>
						{/if}
					</div>
				{/if}
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">No hay datos disponibles</p>
		{/if}
	</CardContent>
</Card>

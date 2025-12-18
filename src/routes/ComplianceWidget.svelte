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

	const complianceColor = $derived.by(() => {
		if (!summary) return 'text-muted-foreground';
		if (summary.compliancePercentage >= 80) return 'text-success';
		if (summary.compliancePercentage >= 50) return 'text-yellow-600';
		return 'text-destructive';
	});

	const progressWidth = $derived(
		summary ? `${Math.min(100, summary.compliancePercentage)}%` : '0%'
	);
	const progressColor = $derived.by(() => {
		if (!summary) return 'bg-muted';
		if (summary.compliancePercentage >= 80) return 'bg-success';
		if (summary.compliancePercentage >= 50) return 'bg-yellow-500';
		return 'bg-destructive';
	});
</script>

<Card class="w-full flex-1">
	<CardHeader class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
		<CardTitle class="text-sm font-medium flex items-center gap-2 text-muted-foreground">
			<span class="material-symbols-rounded text-lg!">analytics</span>
			Cumplimiento Este Mes
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
				<div class="h-8 bg-muted rounded w-20"></div>
				<div class="h-2 bg-muted rounded w-full"></div>
			</div>
		{:else if summary}
			<div class="space-y-3">
				<div class="flex items-baseline gap-2">
					<span class="text-3xl font-bold {complianceColor}">{summary.compliancePercentage}%</span>
					<span class="text-sm text-muted-foreground">
						{summary.daysWorked} / {summary.workingDays} días
					</span>
				</div>

				<div class="h-2 bg-muted rounded-full overflow-hidden">
					<div
						class="h-full transition-all duration-500 {progressColor}"
						style="width: {progressWidth}"
					></div>
				</div>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">No hay datos disponibles</p>
		{/if}
	</CardContent>
</Card>

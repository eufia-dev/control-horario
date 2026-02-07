<script lang="ts">
	import { ChartContainer, type ChartConfig } from '$lib/components/ui/chart';
	import { Chart, Svg, Axis, Bars, Bar, Grid, Tooltip } from 'layerchart';
	import { scaleBand, scaleLinear } from 'd3-scale';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Combobox } from '$lib/components/ui/combobox';
	import {
		type ProjectSummary,
		type WorkerBreakdown,
		fetchProjectBreakdown,
		formatCost
	} from '$lib/api/analytics';
	import { stringToColor } from '$lib/utils';

	let {
		projects,
		loading = false,
		showCosts = true
	}: {
		projects: ProjectSummary[];
		loading?: boolean;
		showCosts?: boolean;
	} = $props();

	let mainViewMode = $state<'hours' | 'cost'>('hours');
	let breakdownViewMode = $state<'hours' | 'cost'>('hours');
	let selectedProjectId = $state<string | null>(null);
	let breakdownData = $state<WorkerBreakdown[]>([]);
	let loadingBreakdown = $state(false);

	const chartConfig: ChartConfig = {
		value: {
			label: 'Valor',
			color: 'var(--chart-1)'
		}
	};

	const breakdownChartConfig: ChartConfig = {
		worker: {
			label: 'Trabajador',
			color: 'var(--chart-1)'
		}
	};

	const chartData = $derived.by(() => {
		const data = projects.map((p) => ({
			...p,
			key: p.id,
			label: p.code,
			fullName: p.name,
			value: mainViewMode === 'cost' ? p.totalCost : p.totalMinutes / 60,
			color: stringToColor(p.id),
			cost: p.totalCost,
			hours: p.totalMinutes / 60
		}));
		return data;
	});

	const keyToLabelMap = $derived(Object.fromEntries(chartData.map((d) => [d.key, d.label])));

	const maxValue = $derived(Math.max(...chartData.map((d) => d.value), 1));

	const selectedProject = $derived(projects.find((p) => p.id === selectedProjectId));

	$effect(() => {
		if (projects.length > 0 && !selectedProjectId) {
			selectProject(projects[0].id);
		}
	});

	async function selectProject(projectId: string) {
		if (selectedProjectId === projectId) return;

		selectedProjectId = projectId;
		loadingBreakdown = true;
		try {
			const response = await fetchProjectBreakdown(projectId);
			breakdownData = response.workers;
		} catch (e) {
			console.error('Error loading project breakdown:', e);
			breakdownData = [];
		} finally {
			loadingBreakdown = false;
		}
	}

	const breakdownChartData = $derived(
		breakdownData.map((w) => ({
			...w,
			key: w.id,
			label: w.name.split(' ')[0],
			fullName: w.name,
			value: breakdownViewMode === 'cost' ? w.totalCost : w.minutes / 60,
			color: stringToColor(w.id),
			workerCost: w.totalCost,
			workerHours: w.minutes / 60
		}))
	);

	const breakdownKeyToLabelMap = $derived(
		Object.fromEntries(breakdownChartData.map((d) => [d.key, d.label]))
	);

	const maxBreakdownValue = $derived(Math.max(...breakdownChartData.map((d) => d.value), 1));

	function formatValue(value: number, mode: 'hours' | 'cost'): string {
		if (mode === 'cost') {
			return formatCost(value);
		}
		return `${value.toFixed(1)}h`;
	}
</script>

<div class="grid gap-6 lg:grid-cols-2">
	<Card class="overflow-hidden">
		<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
			<CardTitle class="text-xl font-semibold">Proyectos</CardTitle>
			{#if showCosts}
				<div class="flex gap-1 rounded-lg bg-muted p-1">
					<Button
						variant={mainViewMode === 'hours' ? 'default' : 'ghost'}
						size="sm"
						class="h-7 px-3 text-xs"
						onclick={() => (mainViewMode = 'hours')}
					>
						Horas
					</Button>
					<Button
						variant={mainViewMode === 'cost' ? 'default' : 'ghost'}
						size="sm"
						class="h-7 px-3 text-xs"
						onclick={() => (mainViewMode = 'cost')}
					>
						Coste
					</Button>
				</div>
			{/if}
		</CardHeader>
		<CardContent>
			{#if loading}
				<div class="h-[300px] flex items-end justify-around gap-2 pt-8">
					{#each Array.from({ length: 6 }, (_, i) => i) as i (i)}
						<div class="flex flex-col items-center gap-2 flex-1" data-placeholder-index={i}>
							<Skeleton class="w-full" style="height: {50 + Math.random() * 150}px" />
							<Skeleton class="h-3 w-12" />
						</div>
					{/each}
				</div>
			{:else if chartData.length === 0}
				<div class="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
					<span class="material-symbols-rounded text-4xl! mb-2">bar_chart</span>
					<p>No hay datos de proyectos</p>
				</div>
			{:else}
				<ChartContainer config={chartConfig} class="h-[300px] w-full min-w-0">
					<Chart
						data={chartData}
						x="key"
						xScale={scaleBand().padding(0.2)}
						xDomain={chartData.map((d) => d.key)}
						y="value"
						yScale={scaleLinear()}
						yDomain={[0, maxValue * 1.1]}
						padding={{ left: 48, right: 8, top: 16, bottom: 32 }}
						tooltip={{ mode: 'band' }}
					>
						<Svg>
							<Grid y class="stroke-muted" />
							<Axis
								placement="left"
								tickLabelProps={{ class: 'text-xs fill-muted-foreground' }}
								format={(d: number) =>
									mainViewMode === 'cost'
										? `€${d >= 1000 ? `${(d / 1000).toFixed(0)}k` : d}`
										: `${d}h`}
							/>
							<Axis
								placement="bottom"
								tickLabelProps={{ class: 'text-xs fill-muted-foreground' }}
								format={(key: string) => keyToLabelMap[key] ?? key}
							/>
							<Bars radius={4} strokeWidth={0}>
								{#each chartData as item (item.id)}
									<Bar data={item} fill={item.color} radius={4} strokeWidth={0} />
								{/each}
							</Bars>
						</Svg>
						<Tooltip.Root variant="none">
							{#snippet children({ data })}
								{#if data}
									<div
										class="border-border/50 bg-background min-w-40 rounded-lg border px-3 py-2 text-xs shadow-xl"
									>
										<div class="font-medium mb-1.5">{data.fullName}</div>
										{#if showCosts}
											<div class="flex items-center justify-between gap-4">
												<span class="text-muted-foreground">Coste total</span>
												<span class="font-mono font-medium">{formatCost(data.cost)}</span>
											</div>
										{/if}
										<div class="flex items-center justify-between gap-4 mt-1">
											<span class="text-muted-foreground">Horas</span>
											<span class="font-mono font-medium">{data.hours.toFixed(1)}h</span>
										</div>
									</div>
								{/if}
							{/snippet}
						</Tooltip.Root>
					</Chart>
				</ChartContainer>

				<div
					class="flex flex-wrap items-center justify-center gap-3 mt-2 text-xs text-muted-foreground"
				>
					{#each chartData as project (project.id)}
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-sm" style="background-color: {project.color}"></span>
							<span>{project.code}</span>
						</div>
					{/each}
				</div>
			{/if}
		</CardContent>
	</Card>

	<Card class="overflow-hidden">
		<CardHeader class="flex flex-row items-start justify-between gap-4 pb-2">
			<div class="flex-1 min-w-0">
				<CardTitle class="text-xl font-semibold">Por proyecto</CardTitle>
				{#if selectedProject}
					<p class="text-xs text-muted-foreground mt-1">
						{selectedProject.code} · {formatValue(
							showCosts && breakdownViewMode === 'cost'
								? selectedProject.totalCost
								: selectedProject.totalMinutes / 60,
							showCosts ? breakdownViewMode : 'hours'
						)} total
					</p>
				{/if}
			</div>
			<div class="flex flex-col sm:flex-row items-end sm:items-center gap-2">
				{#if projects.length > 0}
					<Combobox
						items={projects}
						value={selectedProjectId ?? undefined}
						onValueChange={(value) => value && selectProject(value)}
						getItemValue={(p) => p.id}
						getItemLabel={(p) => `${p.code} - ${p.name}`}
						placeholder="Seleccionar..."
						searchPlaceholder="Buscar proyecto"
						emptyMessage="No se encontraron proyectos."
						class="w-[180px] h-8 text-sm"
					>
						{#snippet selectedSnippet({ item })}
							<span class="truncate">{item.code}</span>
						{/snippet}
						{#snippet itemSnippet({ item })}
							<div class="flex flex-col">
								<span class="font-medium">{item.code}</span>
								<span class="text-muted-foreground text-xs">{item.name}</span>
							</div>
						{/snippet}
					</Combobox>
				{/if}
				{#if showCosts}
					<div class="flex gap-1 rounded-lg bg-muted p-1">
						<Button
							variant={breakdownViewMode === 'hours' ? 'default' : 'ghost'}
							size="sm"
							class="h-7 px-3 text-xs"
							onclick={() => (breakdownViewMode = 'hours')}
						>
							Horas
						</Button>
						<Button
							variant={breakdownViewMode === 'cost' ? 'default' : 'ghost'}
							size="sm"
							class="h-7 px-3 text-xs"
							onclick={() => (breakdownViewMode = 'cost')}
						>
							Coste
						</Button>
					</div>
				{/if}
			</div>
		</CardHeader>
		<CardContent>
			{#if !selectedProjectId}
				<div class="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
					<span class="material-symbols-rounded text-4xl! mb-2">touch_app</span>
					<p>Selecciona un proyecto para ver el desglose</p>
				</div>
			{:else if loadingBreakdown}
				<div class="h-[300px] flex items-end justify-around gap-2 pt-8">
					{#each Array.from({ length: 4 }, (_, i) => i) as i (i)}
						<div class="flex flex-col items-center gap-2 flex-1" data-placeholder-index={i}>
							<Skeleton class="w-full" style="height: {50 + Math.random() * 150}px" />
							<Skeleton class="h-3 w-10" />
						</div>
					{/each}
				</div>
			{:else if breakdownChartData.length === 0}
				<div class="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
					<span class="material-symbols-rounded text-4xl! mb-2">group_off</span>
					<p>No hay datos de trabajadores</p>
				</div>
			{:else}
				<ChartContainer config={breakdownChartConfig} class="h-[300px] w-full min-w-0">
					<Chart
						data={breakdownChartData}
						x="key"
						xScale={scaleBand().padding(0.2)}
						xDomain={breakdownChartData.map((d) => d.key)}
						y="value"
						yScale={scaleLinear()}
						yDomain={[0, maxBreakdownValue * 1.1]}
						padding={{ left: 48, right: 8, top: 16, bottom: 32 }}
						tooltip={{ mode: 'band' }}
					>
						<Svg>
							<Grid y class="stroke-muted/50" />
							<Axis
								placement="left"
								tickLabelProps={{ class: 'text-xs fill-muted-foreground' }}
								format={(d: number) =>
									breakdownViewMode === 'cost'
										? `€${d >= 1000 ? `${(d / 1000).toFixed(0)}k` : d}`
										: `${d}h`}
							/>
							<Axis
								placement="bottom"
								tickLabelProps={{ class: 'text-xs fill-muted-foreground' }}
								format={(key: string) => breakdownKeyToLabelMap[key] ?? key}
							/>
							<Bars radius={3} strokeWidth={0}>
								{#each breakdownChartData as item (item.id)}
									<Bar data={item} fill={item.color} radius={3} strokeWidth={0} />
								{/each}
							</Bars>
						</Svg>
						<Tooltip.Root variant="none">
							{#snippet children({ data })}
								{#if data}
									<div
										class="border-border/50 bg-background min-w-40 rounded-lg border px-3 py-2 text-xs shadow-xl"
									>
										<div class="font-medium mb-1.5">{data.fullName}</div>
										{#if showCosts}
											<div class="text-muted-foreground text-[10px] mb-1.5">
												{formatCost(data.hourlyCost)}/h
											</div>
											<div class="flex items-center justify-between gap-4">
												<span class="text-muted-foreground">Coste</span>
												<span class="font-mono font-medium">{formatCost(data.workerCost)}</span>
											</div>
										{/if}
										<div class="flex items-center justify-between gap-4 mt-1">
											<span class="text-muted-foreground">Horas</span>
											<span class="font-mono font-medium">{data.workerHours.toFixed(1)}h</span>
										</div>
									</div>
								{/if}
							{/snippet}
						</Tooltip.Root>
					</Chart>
				</ChartContainer>

				<div
					class="flex flex-wrap items-center justify-center gap-3 mt-2 text-xs text-muted-foreground"
				>
					{#each breakdownChartData as worker (worker.id)}
						<div class="flex items-center gap-1.5">
							<span class="w-2.5 h-2.5 rounded-sm" style="background-color: {worker.color}"></span>
							<span>{worker.label}</span>
						</div>
					{/each}
				</div>
			{/if}
		</CardContent>
	</Card>
</div>

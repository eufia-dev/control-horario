<script lang="ts">
	import { ChartContainer, ChartTooltip, type ChartConfig } from '$lib/components/ui/chart';
	import { Chart, Svg, Axis, Bars, Grid, Tooltip } from 'layerchart';
	import { scaleBand, scaleLinear } from 'd3-scale';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import {
		type ProjectSummary,
		type WorkerBreakdown,
		fetchProjectBreakdown,
		formatCost
	} from '$lib/api/analytics';

	// Props
	let {
		projects,
		loading = false
	}: {
		projects: ProjectSummary[];
		loading?: boolean;
	} = $props();

	// State
	let viewMode = $state<'hours' | 'cost'>('cost');
	let selectedProjectId = $state<string | null>(null);
	let breakdownData = $state<WorkerBreakdown[]>([]);
	let loadingBreakdown = $state(false);

	// Chart config for colors and labels
	const chartConfig: ChartConfig = {
		value: {
			label: 'Valor',
			color: 'var(--chart-1)'
		}
	};

	// Breakdown chart config
	const breakdownChartConfig: ChartConfig = {
		internal: {
			label: 'Interno',
			color: 'var(--chart-1)'
		},
		external: {
			label: 'Externo',
			color: 'var(--chart-2)'
		}
	};

	// Transform data for vertical bar chart - x as category, y as value
	const chartData = $derived.by(() => {
		const data = projects.map((p) => ({
			...p,
			label: p.code, // Use code for x-axis (shorter)
			fullName: p.name,
			value: viewMode === 'cost' ? p.totalCost : p.totalMinutes / 60
		}));
		return data;
	});

	// Max value for scale
	const maxValue = $derived(Math.max(...chartData.map((d) => d.value), 1));

	// Selected project
	const selectedProject = $derived(projects.find((p) => p.id === selectedProjectId));

	// Auto-select first project when data loads
	$effect(() => {
		if (projects.length > 0 && !selectedProjectId) {
			handleProjectClick(projects[0]);
		}
	});

	// Handle bar click to select project
	async function handleProjectClick(project: ProjectSummary) {
		if (selectedProjectId === project.id) return;

		selectedProjectId = project.id;
		loadingBreakdown = true;
		try {
			const response = await fetchProjectBreakdown(project.id);
			breakdownData = response.workers;
		} catch (e) {
			console.error('Error loading project breakdown:', e);
			breakdownData = [];
		} finally {
			loadingBreakdown = false;
		}
	}

	// Transform breakdown data for vertical bar chart
	const breakdownChartData = $derived(
		breakdownData.map((w) => ({
			...w,
			label: w.name.split(' ')[0], // First name only for x-axis
			fullName: w.name,
			value: viewMode === 'cost' ? w.totalCost : w.minutes / 60
		}))
	);

	const maxBreakdownValue = $derived(Math.max(...breakdownChartData.map((d) => d.value), 1));

	// Format value based on view mode
	function formatValue(value: number): string {
		if (viewMode === 'cost') {
			return formatCost(value);
		}
		return `${value.toFixed(1)}h`;
	}
</script>

<div class="grid gap-6 lg:grid-cols-2">
	<!-- Main Projects Chart -->
	<Card>
		<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
			<CardTitle class="text-xl font-semibold">Costes por Proyecto</CardTitle>
			<div class="flex gap-1 rounded-lg bg-muted p-1">
				<Button
					variant={viewMode === 'hours' ? 'default' : 'ghost'}
					size="sm"
					class="h-7 px-3 text-xs"
					onclick={() => (viewMode = 'hours')}
				>
					Horas
				</Button>
				<Button
					variant={viewMode === 'cost' ? 'default' : 'ghost'}
					size="sm"
					class="h-7 px-3 text-xs"
					onclick={() => (viewMode = 'cost')}
				>
					Coste
				</Button>
			</div>
		</CardHeader>
		<CardContent>
			{#if loading}
				<div class="h-[300px] flex items-end justify-around gap-2 pt-8">
					{#each Array(6) as _, i}
						<div class="flex flex-col items-center gap-2 flex-1">
							<Skeleton class="w-full" style="height: {50 + Math.random() * 150}px" />
							<Skeleton class="h-3 w-12" />
						</div>
					{/each}
				</div>
		{:else if chartData.length === 0}
			<div class="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
				<span class="material-symbols-rounded text-4xl! mb-2">bar_chart</span>
				<p>No hay datos de proyectos</p>
				<p class="text-xs mt-2">Raw projects prop: {JSON.stringify(projects).slice(0, 100)}</p>
			</div>
			{:else}
				<!-- Vertical Bar Chart -->
				<ChartContainer config={chartConfig} class="h-[300px] w-full">
					<Chart
						data={chartData}
						x="label"
						xScale={scaleBand().padding(0.3)}
						xDomain={chartData.map((d) => d.label)}
						y="value"
						yScale={scaleLinear()}
						yDomain={[0, maxValue * 1.1]}
						padding={{ left: 60, right: 20, top: 20, bottom: 40 }}
					>
						<Svg>
							<Grid y class="stroke-muted" />
							<Axis
								placement="left"
								tickLabelProps={{ class: 'text-xs fill-muted-foreground' }}
								format={(d: number) => (viewMode === 'cost' ? `€${d >= 1000 ? `${(d/1000).toFixed(0)}k` : d}` : `${d}h`)}
							/>
							<Axis
								placement="bottom"
								tickLabelProps={{ class: 'text-xs fill-muted-foreground' }}
							/>
						<Bars
							radius={4}
							strokeWidth={0}
							fill="var(--chart-1)"
						/>
						</Svg>
						<Tooltip.Root>
							<ChartTooltip />
						</Tooltip.Root>
					</Chart>
				</ChartContainer>

				<!-- Legend -->
				<div class="flex items-center justify-between mt-2 text-xs text-muted-foreground">
					<div class="flex items-center gap-1.5">
						<span class="w-2.5 h-2.5 rounded-sm bg-chart-1"></span>
						<span>Seleccionado</span>
						<span class="w-2.5 h-2.5 rounded-sm bg-chart-3 opacity-60 ml-3"></span>
						<span>Otros proyectos</span>
					</div>
					<span>Click en una barra para ver desglose →</span>
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Project Breakdown Card -->
	<Card>
		<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
			<div>
				<CardTitle class="text-xl font-semibold">
					{#if selectedProject}
						{selectedProject.name}
					{:else}
						Desglose por Trabajador
					{/if}
				</CardTitle>
				{#if selectedProject}
					<p class="text-xs text-muted-foreground mt-1">
						{selectedProject.code} · {formatValue(viewMode === 'cost' ? selectedProject.totalCost : selectedProject.totalMinutes / 60)} total
					</p>
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
					{#each Array(4) as _}
						<div class="flex flex-col items-center gap-2 flex-1">
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
				<!-- Breakdown Vertical Bar Chart -->
				<ChartContainer config={breakdownChartConfig} class="h-[300px] w-full">
					<Chart
						data={breakdownChartData}
						x="label"
						xScale={scaleBand().padding(0.3)}
						xDomain={breakdownChartData.map((d) => d.label)}
						y="value"
						yScale={scaleLinear()}
						yDomain={[0, maxBreakdownValue * 1.1]}
						padding={{ left: 60, right: 20, top: 20, bottom: 40 }}
					>
						<Svg>
							<Grid y class="stroke-muted/50" />
							<Axis
								placement="left"
								tickLabelProps={{ class: 'text-xs fill-muted-foreground' }}
								format={(d: number) => (viewMode === 'cost' ? `€${d >= 1000 ? `${(d/1000).toFixed(0)}k` : d}` : `${d}h`)}
							/>
							<Axis
								placement="bottom"
								tickLabelProps={{ class: 'text-xs fill-muted-foreground' }}
							/>
							<Bars
								radius={3}
								strokeWidth={0}
								fill="var(--chart-2)"
							/>
						</Svg>
						<Tooltip.Root>
							<ChartTooltip />
						</Tooltip.Root>
					</Chart>
				</ChartContainer>

				<!-- Legend -->
				<div class="flex gap-4 mt-2 text-xs text-muted-foreground">
					<div class="flex items-center gap-1.5">
						<span class="w-2.5 h-2.5 rounded-sm bg-chart-1"></span>
						<span>Internos</span>
					</div>
					<div class="flex items-center gap-1.5">
						<span class="w-2.5 h-2.5 rounded-sm bg-chart-2"></span>
						<span>Externos</span>
					</div>
				</div>
			{/if}
		</CardContent>
	</Card>
</div>

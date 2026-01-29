<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { isAdmin as isAdminStore } from '$lib/stores/auth';
	import { getMonthName, getMonthOptions, getYearOptions } from '$lib/api/costs';
	import {
		fetchMonthlyClosing,
		type MonthClosingStatus,
		type MonthlyClosingResponse
	} from '$lib/api/month-closing';
	import MonthStatusBadge from './MonthStatusBadge.svelte';
	import { MENSUAL_CONTEXT_KEY, type MensualContext } from './context';

	let { children } = $props();

	let isAdmin = $state(false);

	$effect(() => {
		const unsub = isAdminStore.subscribe((value) => {
			isAdmin = value ?? false;
		});
		return unsub;
	});

	// Date selection
	const currentDate = new Date();
	let selectedYear = $state(currentDate.getFullYear().toString());
	let selectedMonth = $state((currentDate.getMonth() + 1).toString());

	// Month closing state
	let monthStatus = $state<MonthClosingStatus>('OPEN');
	let closingData = $state<MonthlyClosingResponse | null>(null);
	let loadingClosing = $state(true); // Start as true until initial load completes

	// Options - convert to string values for Select
	const monthOptions = getMonthOptions().map((o) => ({
		value: o.value.toString(),
		label: o.label
	}));
	const yearOptions = getYearOptions().map((o) => ({ value: o.value.toString(), label: o.label }));

	const selectedMonthLabel = $derived(getMonthName(parseInt(selectedMonth)));
	const selectedYearLabel = $derived(selectedYear);

	// Tab definitions
	type TabValue = 'projects' | 'salaries' | 'overhead' | 'closing';

	const tabs: { value: TabValue; label: string; icon: string }[] = [
		{ value: 'projects', label: 'Proyectos', icon: 'work' },
		{ value: 'salaries', label: 'Salarios', icon: 'payments' },
		{ value: 'overhead', label: 'Gastos Generales', icon: 'receipt_long' },
		{ value: 'closing', label: 'Cierre', icon: 'pie_chart' }
	];

	function isActiveTab(tabValue: TabValue): boolean {
		const currentPath = $page.url.pathname;
		return currentPath.includes(`/costs/mensual/${tabValue}`);
	}

	async function loadClosingStatus() {
		loadingClosing = true;
		try {
			const year = parseInt(selectedYear);
			const month = parseInt(selectedMonth);
			closingData = await fetchMonthlyClosing(year, month);
			monthStatus = closingData.status;
		} catch {
			// If closing doesn't exist yet, default to OPEN
			monthStatus = 'OPEN';
			closingData = null;
		} finally {
			loadingClosing = false;
		}
	}

	function handleStatusChange(
		newStatus: MonthClosingStatus,
		newClosingData?: MonthlyClosingResponse
	) {
		monthStatus = newStatus;
		if (newClosingData) {
			closingData = newClosingData;
		}
	}

	// Track previous values for change detection
	let previousYear = $state<string | null>(null);
	let previousMonth = $state<string | null>(null);

	onMount(() => {
		previousYear = selectedYear;
		previousMonth = selectedMonth;
		loadClosingStatus();
	});

	// Reload closing status when year/month changes
	$effect(() => {
		const currentYear = selectedYear;
		const currentMonth = selectedMonth;
		// Skip if not yet initialized (onMount hasn't run)
		if (previousYear === null || previousMonth === null) return;
		if (currentYear !== previousYear || currentMonth !== previousMonth) {
			previousYear = currentYear;
			previousMonth = currentMonth;
			loadClosingStatus();
		}
	});

	// Set context for child pages
	const contextValue = $derived<MensualContext>({
		year: parseInt(selectedYear),
		month: parseInt(selectedMonth),
		monthStatus,
		closingData,
		loadingClosing,
		onStatusChange: handleStatusChange
	});

	// We need to use setContext with a reactive getter
	setContext(MENSUAL_CONTEXT_KEY, {
		get value() {
			return contextValue;
		}
	});
</script>

<!-- Header with Month/Year Selector and Status Badge -->
<div class="flex flex-wrap items-center gap-4">
	<div class="flex items-center gap-2">
		<Select type="single" bind:value={selectedYear}>
			<SelectTrigger class="w-[100px] bg-card">
				{selectedYearLabel}
			</SelectTrigger>
			<SelectContent>
				{#each yearOptions as option (option.value)}
					<SelectItem value={option.value} label={option.label} />
				{/each}
			</SelectContent>
		</Select>
		
		<Select type="single" bind:value={selectedMonth}>
			<SelectTrigger class="w-[140px] bg-card">
				{selectedMonthLabel}
			</SelectTrigger>
			<SelectContent>
				{#each monthOptions as option (option.value)}
					<SelectItem value={option.value} label={option.label} />
				{/each}
			</SelectContent>
		</Select>

		<!-- Month Status Badge -->
		{#if !loadingClosing}
			<MonthStatusBadge
				status={monthStatus}
				closedAt={closingData?.closedAt}
				closedBy={closingData?.closedBy?.name}
			/>
		{/if}
	</div>
</div>

<!-- Tab Navigation - Only show for admins/owners -->
{#if isAdmin}
	<div class="overflow-x-auto -mb-2">
		<nav
			class="bg-muted text-muted-foreground inline-flex w-fit items-center justify-center rounded-lg p-[3px]"
		>
			{#each tabs as tab (tab.value)}
				<a
					href={resolve(`/costs/mensual/${tab.value}`)}
					data-state={isActiveTab(tab.value) ? 'active' : 'inactive'}
					class="data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-3 py-1.5 text-sm font-medium transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] data-[state=active]:shadow-sm"
				>
					<span class="material-symbols-rounded text-lg!">{tab.icon}</span>
					<span>{tab.label}</span>
				</a>
			{/each}
		</nav>
	</div>
{/if}

<!-- Child page content -->
{@render children()}

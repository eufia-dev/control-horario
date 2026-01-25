<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { type CostEstimate } from '$lib/api/costs';

	type Props = {
		// Revenue data
		estimatedRevenue: number | null;
		actualRevenue: number | null;
		// Costs data
		estimatedCosts: CostEstimate[];
		estimatedCostsTotal: number;
		actualCostsTotal: number;
		// Change tracking
		isChanged: boolean;
		// Callbacks
		onRevenueChange: (field: 'estimatedRevenue' | 'actualRevenue', value: number | null) => void;
		onCostEstimateChange: (value: number | null) => void;
		onOpenEstimatesDialog: () => void;
		onOpenActualsDialog: () => void;
	};

	let {
		estimatedRevenue,
		actualRevenue,
		estimatedCosts,
		estimatedCostsTotal,
		actualCostsTotal,
		isChanged,
		onRevenueChange,
		onCostEstimateChange,
		onOpenEstimatesDialog,
		onOpenActualsDialog
	}: Props = $props();

	// Local state for inputs - derived from props, writable for user edits
	let localEstimatedRevenue = $derived(
		estimatedRevenue !== null ? estimatedRevenue.toString() : ''
	);
	let localActualRevenue = $derived(actualRevenue !== null ? actualRevenue.toString() : '');
	let localCostEstimate = $derived.by(() => {
		if (estimatedCosts.length === 1) {
			return estimatedCosts[0].amount.toString();
		} else if (estimatedCosts.length === 0) {
			return '';
		} else {
			return estimatedCostsTotal.toString();
		}
	});

	// Determine if cost estimate is editable inline
	const canEditCostEstimateInline = $derived(estimatedCosts.length <= 1);

	function parseNumber(value: string | number | null | undefined): number | null {
		if (value === null || value === undefined) return null;
		if (typeof value === 'number') return isNaN(value) ? null : value;
		const trimmed = value.trim();
		if (trimmed === '') return null;
		const parsed = parseFloat(trimmed);
		return isNaN(parsed) ? null : parsed;
	}

	function handleEstimatedRevenueBlur() {
		const value = parseNumber(localEstimatedRevenue);
		if (value !== estimatedRevenue) {
			onRevenueChange('estimatedRevenue', value);
		}
	}

	function handleActualRevenueBlur() {
		const value = parseNumber(localActualRevenue);
		if (value !== actualRevenue) {
			onRevenueChange('actualRevenue', value);
		}
	}

	function handleCostEstimateBlur() {
		if (!canEditCostEstimateInline) return;
		const value = parseNumber(localCostEstimate);
		const currentValue = estimatedCosts.length === 1 ? estimatedCosts[0].amount : null;
		if (value !== currentValue) {
			onCostEstimateChange(value);
		}
	}

	function handleKeyDown(e: KeyboardEvent, onBlur: () => void) {
		if (e.key === 'Enter') {
			e.preventDefault();
			onBlur();
			(e.target as HTMLElement).blur();
		}
	}
</script>

<div
	class="flex flex-col gap-0.5 p-1 rounded-md min-w-[100px] {isChanged
		? 'bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800'
		: ''}"
>
	<!-- Row 1: Estimated Revenue -->
	<div class="flex items-center gap-0.5">
		<span class="material-symbols-rounded text-success text-sm! w-4 shrink-0">trending_up</span>
		<Input
			type="number"
			step="0.01"
			min="0"
			placeholder="—"
			bind:value={localEstimatedRevenue}
			onblur={handleEstimatedRevenueBlur}
			onkeydown={(e) => handleKeyDown(e, handleEstimatedRevenueBlur)}
			class="h-6 text-xs px-1.5 text-right flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
		/>
	</div>

	<!-- Row 2: Actual Revenue -->
	<div class="flex items-center gap-0.5">
		<span class="material-symbols-rounded text-success text-sm! w-4 shrink-0">check_circle</span>
		<Input
			type="number"
			step="0.01"
			min="0"
			placeholder="—"
			bind:value={localActualRevenue}
			onblur={handleActualRevenueBlur}
			onkeydown={(e) => handleKeyDown(e, handleActualRevenueBlur)}
			class="h-6 text-xs px-1.5 text-right flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
		/>
	</div>

	<!-- Row 3: Estimated Cost -->
	<div class="flex items-center gap-0.5">
		<span class="material-symbols-rounded text-destructive text-sm! w-4 shrink-0"
			>trending_down</span
		>
		{#if canEditCostEstimateInline}
			<Input
				type="number"
				step="0.01"
				min="0"
				placeholder="—"
				bind:value={localCostEstimate}
				onblur={handleCostEstimateBlur}
				onkeydown={(e) => handleKeyDown(e, handleCostEstimateBlur)}
				class="h-6 text-xs px-1.5 text-right flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
			/>
		{:else}
			<!-- Multiple estimates: show sum with button to open dialog -->
			<Button
				variant="ghost"
				size="sm"
				class="h-6 flex-1 text-xs px-1.5 border hover:bg-muted font-normal justify-end"
				onclick={onOpenEstimatesDialog}
			>
				{estimatedCostsTotal}
			</Button>
		{/if}
	</div>

	<!-- Row 4: Actual Cost -->
	<div class="flex items-center gap-0.5">
		<span class="material-symbols-rounded text-destructive text-sm! w-4 shrink-0">receipt_long</span
		>
		<Button
			variant="ghost"
			size="sm"
			class="h-6 flex-1 text-xs px-1.5 border hover:bg-muted font-normal justify-end"
			onclick={onOpenActualsDialog}
		>
			{actualCostsTotal}
		</Button>
	</div>
</div>

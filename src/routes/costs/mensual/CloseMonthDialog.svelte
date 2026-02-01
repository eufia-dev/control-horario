<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import {
		closeMonth,
		type DistributionPreviewResponse,
		type MonthlyClosingResponse
	} from '$lib/api/month-closing';
	import { formatCurrency, getMonthName } from '$lib/api/costs';

	type Props = {
		open: boolean;
		year: number;
		month: number;
		preview: DistributionPreviewResponse | null;
		onSuccess: (closingData: MonthlyClosingResponse) => void;
	};

	let { open = $bindable(), year, month, preview, onSuccess }: Props = $props();

	let submitting = $state(false);
	let error = $state<string | null>(null);

	const monthName = $derived(getMonthName(month));

	async function handleClose() {
		if (submitting) return;
		error = null;
		submitting = true;

		try {
			const result = await closeMonth(year, month);
			open = false;
			onSuccess(result.closing);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cerrar el mes';
		} finally {
			submitting = false;
		}
	}

	function handleCancel() {
		open = false;
	}

	$effect(() => {
		if (!open) {
			error = null;
		}
	});
</script>

<Dialog bind:open>
	<DialogContent class="sm:max-w-5xl">
		<DialogHeader>
			<DialogTitle>Cerrar {monthName} {year}</DialogTitle>
			<DialogDescription>
				Revisa la distribución de costes antes de cerrar el mes. Esta acción creará un snapshot de
				los datos actuales.
			</DialogDescription>
		</DialogHeader>

		{#if preview}
			<div class="space-y-4 py-4">
				<!-- Summary Cards - matching page layout -->
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
					<!-- Ingresos -->
					<div class="p-3 bg-muted rounded-lg">
						<div class="text-xs text-muted-foreground mb-1">Ingresos Totales</div>
						<div class="text-lg font-bold text-success">{formatCurrency(preview.totalRevenue)}</div>
					</div>

					<!-- Gastos Generales -->
					<div class="p-3 bg-muted rounded-lg">
						<div class="text-xs text-muted-foreground mb-1">Gastos Generales</div>
						<div class="text-lg font-bold">{formatCurrency(preview.totalOverhead)}</div>
					</div>

					<!-- Salarios - spans 2 columns -->
					<div class="p-3 bg-muted rounded-lg">
						<div class="text-xs text-muted-foreground mb-1">Total Salarios</div>
						<div class="text-lg font-bold">{formatCurrency(preview.totalSalaries)}</div>
					</div>
				</div>

				<!-- Distribution Preview Table -->
				<div>
					<h4 class="text-sm font-medium mb-2">Distribución por Proyecto</h4>
					<ScrollArea class="max-h-72 border rounded-lg overflow-y-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Proyecto</TableHead>
									<TableHead class="text-right">Ingresos</TableHead>
									<TableHead class="text-right">%</TableHead>
									<TableHead class="text-right">Sal. Directos</TableHead>
									<TableHead class="text-right">Sal. Dist.</TableHead>
									<TableHead class="text-right">Gastos Gen.</TableHead>
									<TableHead class="text-right">Total</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#each preview.distributions as dist (dist.projectId)}
									<TableRow>
										<TableCell>
											<div class="flex flex-col">
												<span class="font-medium">{dist.projectName}</span>
												<span class="text-xs text-muted-foreground">{dist.projectCode}</span>
											</div>
										</TableCell>
										<TableCell class="text-right font-medium text-green-600">
											{formatCurrency(dist.projectRevenue)}
										</TableCell>
										<TableCell class="text-right">
											<Badge variant="outline" class="font-mono text-xs">
												{dist.revenueSharePercent.toFixed(1)}%
											</Badge>
										</TableCell>
										<TableCell class="text-right text-sm text-muted-foreground">
											{formatCurrency(dist.directSalaryCosts)}
										</TableCell>
										<TableCell class="text-right text-sm text-muted-foreground">
											{formatCurrency(dist.distributedSalaries)}
										</TableCell>
										<TableCell class="text-right text-sm text-muted-foreground">
											{formatCurrency(dist.distributedOverhead)}
										</TableCell>
										<TableCell class="text-right font-semibold">
											{formatCurrency(dist.totalDistributed)}
										</TableCell>
									</TableRow>
								{/each}
								<!-- Totals Row -->
								<TableRow class="bg-muted/50 font-semibold">
									<TableCell>Total</TableCell>
									<TableCell class="text-right text-green-600">
										{formatCurrency(preview.totalRevenue)}
									</TableCell>
									<TableCell class="text-right">
										<Badge variant="outline" class="font-mono text-xs">100%</Badge>
									</TableCell>
									<TableCell class="text-right">
										{formatCurrency(preview.totalDirectSalaryCosts)}
									</TableCell>
									<TableCell class="text-right">
										{formatCurrency(preview.totalNonProductive)}
									</TableCell>
									<TableCell class="text-right">
										{formatCurrency(preview.totalOverhead)}
									</TableCell>
									<TableCell class="text-right">
										{formatCurrency(
											preview.totalDirectSalaryCosts +
												preview.totalNonProductive +
												preview.totalOverhead
										)}
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</ScrollArea>
				</div>
			</div>
		{/if}

		{#if error}
			<div class="text-sm text-destructive flex items-center gap-1">
				<span class="material-symbols-rounded text-sm!">error</span>
				{error}
			</div>
		{/if}

		<DialogFooter class="gap-2">
			<Button type="button" variant="outline" onclick={handleCancel} disabled={submitting}>
				Cancelar
			</Button>
			<Button onclick={handleClose} disabled={submitting || !preview?.canClose} class="min-w-28">
				{#if submitting}
					<span class="material-symbols-rounded animate-spin text-lg! mr-2">progress_activity</span>
					Cerrando...
				{:else}
					<span class="material-symbols-rounded text-lg! mr-1">lock</span>
					Cerrar Mes
				{/if}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

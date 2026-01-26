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
	<DialogContent class="sm:max-w-2xl">
		<DialogHeader>
			<DialogTitle>Cerrar {monthName} {year}</DialogTitle>
			<DialogDescription>
				Revisa la distribución de costes antes de cerrar el mes. Esta acción creará un snapshot
				de los datos actuales.
			</DialogDescription>
		</DialogHeader>

		{#if preview}
			<div class="space-y-4 py-4">
				<!-- Summary -->
				<div class="grid grid-cols-3 gap-4">
					<div class="p-3 bg-muted rounded-lg text-center">
						<div class="text-xs text-muted-foreground mb-1">Salarios</div>
						<div class="font-semibold">{formatCurrency(preview.totalSalaries)}</div>
					</div>
					<div class="p-3 bg-muted rounded-lg text-center">
						<div class="text-xs text-muted-foreground mb-1">Gastos Generales</div>
						<div class="font-semibold">{formatCurrency(preview.totalOverhead)}</div>
					</div>
					<div class="p-3 bg-muted rounded-lg text-center">
						<div class="text-xs text-muted-foreground mb-1">Ingresos</div>
						<div class="font-semibold text-green-600">{formatCurrency(preview.totalRevenue)}</div>
					</div>
				</div>

				<!-- Validation Checklist -->
				<div class="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
					<div class="flex items-center gap-2 mb-2">
						<span class="material-symbols-rounded text-green-600 text-lg!">check_circle</span>
						<span class="text-sm font-medium text-green-800 dark:text-green-200">
							Validación completada
						</span>
					</div>
					<ul class="space-y-1 text-sm text-green-700 dark:text-green-300">
						<li class="flex items-center gap-2">
							<span class="material-symbols-rounded text-sm!">check</span>
							Todos los empleados tienen salario base configurado
						</li>
						<li class="flex items-center gap-2">
							<span class="material-symbols-rounded text-sm!">check</span>
							Todos los proyectos activos tienen ingresos
						</li>
						<li class="flex items-center gap-2">
							<span class="material-symbols-rounded text-sm!">check</span>
							{preview.distributions.length} proyecto{preview.distributions.length !== 1 ? 's' : ''} activo{preview.distributions.length !== 1 ? 's' : ''} incluido{preview.distributions.length !== 1 ? 's' : ''}
						</li>
					</ul>
				</div>

				<!-- Distribution Preview Table -->
				<div>
					<h4 class="text-sm font-medium mb-2">Distribución por Proyecto</h4>
					<ScrollArea class="max-h-[200px] border rounded-lg">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Proyecto</TableHead>
									<TableHead class="text-right">%</TableHead>
									<TableHead class="text-right">Salarios</TableHead>
									<TableHead class="text-right">Gastos</TableHead>
									<TableHead class="text-right">Total</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{#each preview.distributions as dist (dist.projectId)}
									<TableRow>
										<TableCell class="font-medium">
											<span class="text-xs text-muted-foreground mr-1">{dist.projectCode}</span>
											{dist.projectName}
										</TableCell>
										<TableCell class="text-right">
											<Badge variant="outline" class="font-mono text-xs">
												{dist.revenueSharePercent.toFixed(1)}%
											</Badge>
										</TableCell>
										<TableCell class="text-right text-sm">
											{formatCurrency(dist.distributedSalaries)}
										</TableCell>
										<TableCell class="text-right text-sm">
											{formatCurrency(dist.distributedOverhead)}
										</TableCell>
										<TableCell class="text-right font-medium">
											{formatCurrency(dist.totalDistributed)}
										</TableCell>
									</TableRow>
								{/each}
							</TableBody>
						</Table>
					</ScrollArea>
				</div>

				<!-- Warning -->
				<div class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
					<div class="flex items-start gap-2">
						<span class="material-symbols-rounded text-amber-600 text-lg!">info</span>
						<div class="text-sm text-amber-800 dark:text-amber-200">
							<p class="font-medium">Importante</p>
							<p class="text-amber-600 dark:text-amber-400 mt-1">
								Una vez cerrado, el mes quedará en modo "soft lock". Podrás editar datos, pero el
								mes pasará a estado "Reabierto" y necesitará ser cerrado de nuevo.
							</p>
						</div>
					</div>
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
			<Button
				onclick={handleClose}
				disabled={submitting || !preview?.canClose}
				class="min-w-28"
			>
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

<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Separator } from '$lib/components/ui/separator';
	import type { Project } from '$lib/api/projects';
	import {
		fetchMonthlyCosts,
		upsertMonthlyRevenue,
		formatCurrency,
		getMonthName,
		type MonthlyCostsSummary
	} from '$lib/api/costs';
	import { isAdmin as isAdminStore } from '$lib/stores/auth';
	import CostEstimatesSection from './CostEstimatesSection.svelte';
	import CostActualsSection from './CostActualsSection.svelte';

	type Props = {
		open: boolean;
		project: Project | null;
		year: number;
		month: number;
		onClose: () => void;
		onSuccess: () => void;
	};

	let { open = $bindable(), project, year, month, onClose, onSuccess }: Props = $props();

	let isAdmin = $state(false);

	$effect(() => {
		const unsub = isAdminStore.subscribe((value) => {
			isAdmin = value ?? false;
		});
		return unsub;
	});

	let costsData = $state<MonthlyCostsSummary | null>(null);
	let loading = $state(false);
	let savingRevenue = $state(false);
	let revenueSuccess = $state(false);
	let error = $state<string | null>(null);

	// Revenue form state
	let estimatedRevenue = $state<number | null>(null);
	let actualRevenue = $state<number | null>(null);
	let notes = $state('');

	let activeTab = $state('produccion');

	const monthName = $derived(getMonthName(month));
	const dialogWidth = $derived(activeTab === 'costes' ? 'sm:max-w-4xl' : 'sm:max-w-2xl');
	const dialogTitle = $derived(project ? `${project.name} - ${monthName} ${year}` : 'Costes');

	// Calculated values - exclude internal costs for non-admins (team leaders)
	const netEstimated = $derived(() => {
		if (costsData === null) return null;
		const revenue = estimatedRevenue ?? 0;
		const externalCosts = costsData.externalCosts.estimated.total;
		const internalCosts = isAdmin ? costsData.internalCosts : 0;
		return revenue - externalCosts - internalCosts;
	});

	const netActual = $derived(() => {
		if (costsData === null) return null;
		const revenue = actualRevenue ?? 0;
		const externalCosts = costsData.externalCosts.actual.total;
		const internalCosts = isAdmin ? costsData.internalCosts : 0;
		return revenue - externalCosts - internalCosts;
	});

	async function loadData() {
		if (!project) return;

		loading = true;
		error = null;

		try {
			costsData = await fetchMonthlyCosts(project.id, year, month);
			estimatedRevenue = costsData.revenue.estimated;
			actualRevenue = costsData.revenue.actual;
			notes = costsData.revenue.notes ?? '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar datos';
		} finally {
			loading = false;
		}
	}

	async function handleSaveRevenue() {
		if (!project || savingRevenue || revenueSuccess) return;

		savingRevenue = true;
		error = null;

		try {
			await upsertMonthlyRevenue(project.id, year, month, {
				estimatedRevenue,
				actualRevenue,
				notes: notes.trim() || null
			});
			revenueSuccess = true;
			onSuccess();
			// Reload data to get updated calculations
			await loadData();
			setTimeout(() => {
				revenueSuccess = false;
			}, 1500);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al guardar producción';
		} finally {
			savingRevenue = false;
		}
	}

	function handleCostsChange() {
		// Reload data after costs are changed
		loadData();
		onSuccess();
	}

	function handleClose() {
		open = false;
		onClose();
	}

	function resetState() {
		costsData = null;
		estimatedRevenue = null;
		actualRevenue = null;
		notes = '';
		error = null;
		activeTab = 'produccion';
		revenueSuccess = false;
	}

	$effect(() => {
		if (open && project) {
			resetState();
			loadData();
		}
	});
</script>

<Dialog bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<DialogContent class="max-h-[90vh] transition-[max-width] duration-200 {dialogWidth}">
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2">
				<span class="material-symbols-rounded text-xl!">account_balance</span>
				{dialogTitle}
			</DialogTitle>
			<DialogDescription>
				{#if project}
					Código: {project.code}
					{#if project.clientName}
						· Cliente: {project.clientName}
					{/if}
					{#if project.delegation}
						· Delegación: {project.delegation}
					{/if}
				{/if}
			</DialogDescription>
		</DialogHeader>

		{#if loading}
			<div class="space-y-4 py-4">
				<Skeleton class="h-10 w-full" />
				<Skeleton class="h-32 w-full" />
				<Skeleton class="h-32 w-full" />
			</div>
		{:else if error && !costsData}
			<div class="flex flex-col items-center justify-center py-8 text-destructive">
				<span class="material-symbols-rounded text-3xl! mb-2">error</span>
				<p>{error}</p>
				<Button variant="outline" class="mt-4" onclick={loadData}>
					<span class="material-symbols-rounded mr-2 text-lg!">refresh</span>
					Reintentar
				</Button>
			</div>
		{:else if costsData && project}
			<Tabs bind:value={activeTab} class="w-full">
				<TabsList class="w-full grid grid-cols-3">
					<TabsTrigger value="produccion" class="gap-1.5">
						<span class="material-symbols-rounded text-lg!">trending_up</span>
						<span>Producción</span>
					</TabsTrigger>
					<TabsTrigger value="costes" class="gap-1.5">
						<span class="material-symbols-rounded text-lg!">receipt_long</span>
						<span>Costes Externos</span>
					</TabsTrigger>
					<TabsTrigger value="resumen" class="gap-1.5">
						<span class="material-symbols-rounded text-lg!">summarize</span>
						<span>Resumen</span>
					</TabsTrigger>
				</TabsList>

				<!-- Producción Tab -->
				<TabsContent value="produccion" class="space-y-4 mt-4">
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="estimatedRevenue">Producción Estimada (€)</Label>
							<Input
								id="estimatedRevenue"
								type="number"
								min="0"
								step="0.01"
								bind:value={estimatedRevenue}
								placeholder="0,00"
								disabled={savingRevenue}
							/>
						</div>
						<div class="space-y-2">
							<Label for="actualRevenue">Producción Real (€)</Label>
							<Input
								id="actualRevenue"
								type="number"
								min="0"
								step="0.01"
								bind:value={actualRevenue}
								placeholder="0,00"
								disabled={savingRevenue}
							/>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="notes">Notas</Label>
						<Textarea
							id="notes"
							bind:value={notes}
							placeholder="Notas adicionales sobre la producción..."
							disabled={savingRevenue}
							rows={3}
						/>
					</div>

					{#if error}
						<div class="text-sm text-destructive">{error}</div>
					{/if}

					<div class="flex justify-end">
						<Button
							onclick={handleSaveRevenue}
							disabled={savingRevenue || revenueSuccess}
							variant={revenueSuccess ? 'success' : 'default'}
							class="min-w-28"
						>
							{#if savingRevenue}
								<span class="material-symbols-rounded animate-spin text-lg!">progress_activity</span
								>
							{:else if revenueSuccess}
								<span class="material-symbols-rounded text-lg! animate-in zoom-in duration-200"
									>check_circle</span
								>
								Guardado
							{:else}
								<span class="material-symbols-rounded mr-2 text-lg!">save</span>
								Guardar
							{/if}
						</Button>
					</div>
				</TabsContent>

				<!-- Costes Externos Tab -->
				<TabsContent value="costes" class="space-y-6 mt-4">
					<CostEstimatesSection
						projectId={project.id}
						{year}
						{month}
						estimates={costsData.externalCosts.estimated.items}
						onChange={handleCostsChange}
					/>

					<Separator />

					<CostActualsSection
						projectId={project.id}
						{year}
						{month}
						actuals={costsData.externalCosts.actual.items}
						onChange={handleCostsChange}
					/>
				</TabsContent>

				<!-- Resumen Tab -->
				<TabsContent value="resumen" class="space-y-4 mt-4">
					<div class="grid grid-cols-2 gap-4">
						<!-- Estimated Column -->
						<Card>
							<CardHeader class="pb-2">
								<CardTitle class="text-sm font-medium text-muted-foreground">Estimado</CardTitle>
							</CardHeader>
							<CardContent class="space-y-3">
								<div class="flex justify-between items-center">
									<span class="text-sm">Producción</span>
									<span class="font-medium text-green-600">
										{formatCurrency(estimatedRevenue)}
									</span>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-sm">Costes Externos</span>
									<span class="font-medium text-red-600">
										-{formatCurrency(costsData.externalCosts.estimated.total)}
									</span>
								</div>
								{#if isAdmin}
									<div class="flex justify-between items-center">
										<span class="text-sm">Costes Internos</span>
										<span class="font-medium text-orange-600">
											-{formatCurrency(costsData.internalCosts)}
										</span>
									</div>
								{/if}
								<Separator />
								<div class="flex justify-between items-center">
									<span class="text-sm font-semibold">Resultado Neto</span>
									<span
										class="font-bold text-lg {netEstimated() !== null && netEstimated()! >= 0
											? 'text-green-600'
											: 'text-red-600'}"
									>
										{formatCurrency(netEstimated())}
									</span>
								</div>
							</CardContent>
						</Card>

						<!-- Actual Column -->
						<Card>
							<CardHeader class="pb-2">
								<CardTitle class="text-sm font-medium text-muted-foreground">Real</CardTitle>
							</CardHeader>
							<CardContent class="space-y-3">
								<div class="flex justify-between items-center">
									<span class="text-sm">Producción</span>
									<span class="font-medium text-green-600">
										{formatCurrency(actualRevenue)}
									</span>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-sm">Costes Externos</span>
									<span class="font-medium text-red-600">
										-{formatCurrency(costsData.externalCosts.actual.total)}
									</span>
								</div>
								{#if isAdmin}
									<div class="flex justify-between items-center">
										<span class="text-sm">Costes Internos</span>
										<span class="font-medium text-orange-600">
											-{formatCurrency(costsData.internalCosts)}
										</span>
									</div>
								{/if}
								<Separator />
								<div class="flex justify-between items-center">
									<span class="text-sm font-semibold">Resultado Neto</span>
									<span
										class="font-bold text-lg {netActual() !== null && netActual()! >= 0
											? 'text-green-600'
											: 'text-red-600'}"
									>
										{formatCurrency(netActual())}
									</span>
								</div>
							</CardContent>
						</Card>
					</div>

					{#if isAdmin}
						<Card class="bg-muted/50">
							<CardContent>
								<div class="flex items-start justify-center gap-3 text-sm text-muted-foreground">
									<span class="material-symbols-rounded text-lg!">info</span>
									<p>
										Los costes internos se calculan automáticamente a partir de las horas registradas
										por el equipo en este proyecto durante el mes, multiplicadas por el coste por hora
										de cada trabajador.
									</p>
								</div>
							</CardContent>
						</Card>
					{/if}
				</TabsContent>
			</Tabs>
		{/if}
	</DialogContent>
</Dialog>

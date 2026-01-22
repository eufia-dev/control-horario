<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Calendar } from '$lib/components/ui/calendar';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import {
		EXPENSE_TYPE_LABELS,
		type CostEstimate,
		type CostActual,
		type ExternalCostExpenseType,
		type CreateCostEstimateDto,
		type UpdateCostEstimateDto,
		type CreateCostActualDto,
		type UpdateCostActualDto
	} from '$lib/api/cash-flow';
	import { fetchProviders, type Provider } from '$lib/api/providers';
	import { CalendarDate } from '@internationalized/date';

	type Props = {
		open: boolean;
		mode: 'estimate' | 'actual';
		item: CostEstimate | CostActual | null;
		onSave: (
			data:
				| CreateCostEstimateDto
				| UpdateCostEstimateDto
				| CreateCostActualDto
				| UpdateCostActualDto
		) => Promise<void>;
		onClose: () => void;
	};

	let { open = $bindable(), mode, item, onSave, onClose }: Props = $props();

	// Providers list
	let providers = $state<Provider[]>([]);
	let loadingProviders = $state(false);

	// Form state
	let amount = $state<number | null>(null);
	let providerId = $state<string>('');
	let expenseType = $state<ExternalCostExpenseType | ''>('');
	let description = $state('');
	let isBilled = $state(false);
	let issueDate = $state<CalendarDate | undefined>(undefined);

	let submitting = $state(false);
	let success = $state(false);
	let error = $state<string | null>(null);

	const isEditMode = $derived(item !== null);
	const isActual = $derived(mode === 'actual');

	const dialogTitle = $derived(() => {
		if (isActual) {
			return isEditMode ? 'Editar Coste Real' : 'Nuevo Coste Real';
		}
		return isEditMode ? 'Editar Estimación' : 'Nueva Estimación';
	});

	const dialogDescription = $derived(() => {
		if (isActual) {
			return isEditMode
				? 'Modifica los datos del coste real.'
				: 'Registra un nuevo coste real con los datos de facturación.';
		}
		return isEditMode
			? 'Modifica los datos de la estimación.'
			: 'Añade una estimación de coste para el presupuesto.';
	});

	const expenseTypeOptions = Object.entries(EXPENSE_TYPE_LABELS).map(([value, label]) => ({
		value: value as ExternalCostExpenseType,
		label
	}));

	const selectedExpenseTypeLabel = $derived(
		expenseType ? EXPENSE_TYPE_LABELS[expenseType] : 'Seleccionar tipo'
	);

	const selectedProviderLabel = $derived(() => {
		if (!providerId) return 'Seleccionar proveedor';
		const provider = providers.find((p) => p.id === providerId);
		return provider ? provider.name : 'Seleccionar proveedor';
	});

	// Get selected provider's payment period for display
	const selectedProviderPaymentPeriod = $derived(() => {
		if (!providerId) return null;
		const provider = providers.find((p) => p.id === providerId);
		return provider?.paymentPeriod ?? null;
	});

	function formatDateLabel(date: CalendarDate | undefined): string {
		if (!date) return 'Seleccionar fecha';
		return new Date(date.year, date.month - 1, date.day).toLocaleDateString('es-ES', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function parseISOToCalendarDate(isoString: string | null | undefined): CalendarDate | undefined {
		if (!isoString) return undefined;
		const date = new Date(isoString);
		return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
	}

	function calendarDateToISO(date: CalendarDate | undefined): string | undefined {
		if (!date) return undefined;
		return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
	}

	async function loadProviders() {
		loadingProviders = true;
		try {
			providers = await fetchProviders();
		} catch (e) {
			console.error('Error loading providers:', e);
		} finally {
			loadingProviders = false;
		}
	}

	function resetForm() {
		amount = null;
		providerId = '';
		expenseType = '';
		description = '';
		isBilled = false;
		issueDate = undefined;
		error = null;
		success = false;
	}

	function populateForm() {
		if (item) {
			amount = item.amount;
			providerId = item.provider?.id ?? '';
			expenseType = item.expenseType ?? '';
			description = item.description ?? '';

			if (mode === 'actual' && 'isBilled' in item) {
				const actual = item as CostActual;
				isBilled = actual.isBilled;
				issueDate = parseISOToCalendarDate(actual.issueDate);
			}
		} else {
			resetForm();
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (submitting || success) return;
		error = null;

		// Validation
		if (amount === null || amount <= 0) {
			error = 'El importe debe ser mayor que 0';
			return;
		}

		if (isActual) {
			if (!providerId) {
				error = 'El proveedor es obligatorio';
				return;
			}
			if (!expenseType) {
				error = 'El tipo de gasto es obligatorio';
				return;
			}
		}

		submitting = true;

		try {
			if (isActual) {
				const data: CreateCostActualDto | UpdateCostActualDto = {
					amount,
					providerId,
					expenseType: expenseType as ExternalCostExpenseType,
					description: description.trim() || undefined,
					isBilled,
					issueDate: calendarDateToISO(issueDate)
				};
				await onSave(data);
			} else {
				const data: CreateCostEstimateDto | UpdateCostEstimateDto = {
					amount,
					providerId: providerId || undefined,
					expenseType: expenseType ? (expenseType as ExternalCostExpenseType) : undefined,
					description: description.trim() || undefined
				};
				await onSave(data);
			}

			success = true;
			setTimeout(() => {
				open = false;
				onClose();
			}, 800);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al guardar';
		} finally {
			submitting = false;
		}
	}

	function handleClose() {
		open = false;
		onClose();
	}

	$effect(() => {
		if (open) {
			loadProviders();
			populateForm();
		}
	});

	$effect(() => {
		if (!open) {
			resetForm();
		}
	});
</script>

<Dialog bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>{dialogTitle()}</DialogTitle>
			<DialogDescription>{dialogDescription()}</DialogDescription>
		</DialogHeader>

		<form onsubmit={handleSubmit} class="grid gap-4 py-4">
			<div class="grid gap-2">
				<Label for="amount">Importe (€) *</Label>
				<Input
					id="amount"
					type="number"
					min="0"
					step="0.01"
					bind:value={amount}
					placeholder="0,00"
					disabled={submitting}
				/>
			</div>

			<div class="grid gap-2">
				<Label>Proveedor {isActual ? '*' : ''}</Label>
				{#if loadingProviders}
					<Skeleton class="h-10 w-full" />
				{:else}
					<Select type="single" bind:value={providerId} disabled={submitting}>
						<SelectTrigger class="w-full">
							{selectedProviderLabel()}
						</SelectTrigger>
						<SelectContent>
							{#if !isActual}
								<SelectItem value="" label="Sin especificar" />
							{/if}
							{#each providers as provider (provider.id)}
								<SelectItem
									value={provider.id}
									label="{provider.name} ({provider.paymentPeriod} días)"
								/>
							{/each}
						</SelectContent>
					</Select>
					{#if providers.length === 0}
						<p class="text-xs text-muted-foreground">
							No hay proveedores disponibles. Crea uno desde Configuración.
						</p>
					{/if}
				{/if}
			</div>

			<div class="grid gap-2">
				<Label>Tipo de Gasto {isActual ? '*' : ''}</Label>
				<Select type="single" bind:value={expenseType} disabled={submitting}>
					<SelectTrigger class="w-full">
						{selectedExpenseTypeLabel}
					</SelectTrigger>
					<SelectContent>
						{#if !isActual}
							<SelectItem value="" label="Sin especificar" />
						{/if}
						{#each expenseTypeOptions as option (option.value)}
							<SelectItem value={option.value} label={option.label} />
						{/each}
					</SelectContent>
				</Select>
			</div>

			<div class="grid gap-2">
				<Label for="description">Descripción</Label>
				<Textarea
					id="description"
					bind:value={description}
					placeholder="Descripción del coste..."
					disabled={submitting}
					rows={2}
				/>
			</div>

			{#if isActual}
				<div class="flex items-center gap-3">
					<Switch id="isBilled" bind:checked={isBilled} disabled={submitting} />
					<Label for="isBilled" class="cursor-pointer">Factura emitida</Label>
				</div>

				<div class="grid gap-2">
					<Label>Fecha de Emisión</Label>
					<Popover>
						<PopoverTrigger>
							<Button variant="outline" class="w-full justify-start text-left font-normal">
								<span class="material-symbols-rounded text-lg! mr-2">calendar_today</span>
								{formatDateLabel(issueDate)}
							</Button>
						</PopoverTrigger>
						<PopoverContent class="w-auto p-0" align="start">
							<Calendar type="single" bind:value={issueDate} initialFocus locale="es" />
						</PopoverContent>
					</Popover>
				</div>

				{#if selectedProviderPaymentPeriod() !== null}
					<div class="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
						<span class="material-symbols-rounded text-sm! align-middle mr-1">info</span>
						Periodo de pago del proveedor: <strong>{selectedProviderPaymentPeriod()} días</strong>
					</div>
				{/if}
			{/if}

			{#if error}
				<div class="text-sm text-destructive">{error}</div>
			{/if}

			<DialogFooter class="gap-2">
				<Button
					type="button"
					variant="outline"
					onclick={handleClose}
					disabled={submitting || success}
				>
					Cancelar
				</Button>
				<Button
					type="submit"
					variant={success ? 'success' : 'default'}
					disabled={submitting || success}
					class="min-w-22"
				>
					{#if submitting}
						<span class="material-symbols-rounded animate-spin text-lg!">progress_activity</span>
					{:else if success}
						<span class="material-symbols-rounded text-lg! animate-in zoom-in duration-200"
							>check_circle</span
						>
						Guardado
					{:else}
						Guardar
					{/if}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

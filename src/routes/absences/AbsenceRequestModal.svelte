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
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { RangeCalendar } from '$lib/components/ui/range-calendar';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import {
		createAbsence,
		fetchAbsenceTypes,
		type AbsenceType,
		type AbsenceTypeOption
	} from '$lib/api/absences';
	import { onMount } from 'svelte';
	import { CalendarDate, type DateValue } from '@internationalized/date';

	type DateRange = {
		start: DateValue | undefined;
		end: DateValue | undefined;
	};

	type Props = {
		open: boolean;
		onClose: () => void;
		onSuccess: () => void;
		initialDate?: string | null; // ISO date string (YYYY-MM-DD)
	};

	let { open = $bindable(), onClose, onSuccess, initialDate = null }: Props = $props();

	function parseISODate(isoDate: string): DateValue {
		const [year, month, day] = isoDate.split('-').map(Number);
		return new CalendarDate(year, month, day);
	}

	let absenceTypes = $state<AbsenceTypeOption[]>([]);
	let loadingTypes = $state(true);

	let selectedType = $state<AbsenceType | undefined>(undefined);
	let dateRange = $state<DateRange | undefined>(undefined);
	let notes = $state('');
	let submitting = $state(false);
	let success = $state(false);
	let error = $state<string | null>(null);

	let dateRangePopoverOpen = $state(false);

	const selectedTypeOption = $derived(absenceTypes.find((t) => t.value === selectedType));

	async function loadAbsenceTypes() {
		loadingTypes = true;
		try {
			absenceTypes = await fetchAbsenceTypes();
			if (absenceTypes.length > 0 && !selectedType) {
				selectedType = absenceTypes[0].value;
			}
		} catch (e) {
			console.error('Error loading absence types:', e);
		} finally {
			loadingTypes = false;
		}
	}

	function resetForm() {
		selectedType = absenceTypes.length > 0 ? absenceTypes[0].value : undefined;
		// If initialDate is provided, pre-fill the date range
		if (initialDate) {
			const startDate = parseISODate(initialDate);
			dateRange = { start: startDate, end: startDate };
		} else {
			dateRange = undefined;
		}
		notes = '';
		error = null;
		success = false;
	}

	$effect(() => {
		if (open) {
			resetForm();
			if (absenceTypes.length === 0) {
				loadAbsenceTypes();
			}
		}
	});

	function formatDate(date: DateValue): string {
		return new Date(date.year, date.month - 1, date.day).toLocaleDateString('es-ES', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function formatDateRange(range: DateRange): string {
		if (!range.start) return 'Seleccionar';
		if (!range.end) return formatDate(range.start);
		if (range.start.compare(range.end) === 0) {
			return formatDate(range.start);
		}
		return `${formatDate(range.start)} - ${formatDate(range.end)}`;
	}

	function toISODate(date: DateValue): string {
		return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (submitting || success) return;
		error = null;

		if (!selectedType) {
			error = 'Selecciona un tipo de ausencia';
			return;
		}

		if (!dateRange || !dateRange.start) {
			error = 'Selecciona el rango de fechas';
			return;
		}

		if (!dateRange.end) {
			error = 'Selecciona la fecha de fin';
			return;
		}

		submitting = true;

		try {
			await createAbsence({
				type: selectedType,
				startDate: toISODate(dateRange.start),
				endDate: toISODate(dateRange.end),
				notes: notes.trim() || undefined
			});

			submitting = false;
			success = true;
			onSuccess();
			// Small delay to show success animation before closing
			setTimeout(() => {
				open = false;
				onClose();
			}, 800);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al solicitar la ausencia';
			submitting = false;
		}
	}

	function handleClose() {
		open = false;
		onClose();
	}

	onMount(() => {
		loadAbsenceTypes();
	});
</script>

<Dialog bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>Nueva Solicitud de Ausencia</DialogTitle>
			<DialogDescription>
				Solicita días de ausencia. Tu solicitud será revisada por un administrador.
			</DialogDescription>
		</DialogHeader>

		<form onsubmit={handleSubmit} class="grid gap-4 py-4">
			<div class="grid gap-2">
				<Label for="type">Tipo de ausencia</Label>
				<Select type="single" bind:value={selectedType} disabled={submitting || loadingTypes}>
					<SelectTrigger class="w-full">
						{#if selectedTypeOption}
							{selectedTypeOption.name}
						{:else}
							<span class="text-muted-foreground">Seleccionar tipo</span>
						{/if}
					</SelectTrigger>
					<SelectContent>
						{#each absenceTypes as type (type.value)}
							<SelectItem value={type.value} label={type.name} />
						{/each}
					</SelectContent>
				</Select>
			</div>

			<div class="grid gap-2">
				<Label>Rango de fechas</Label>
				<Popover bind:open={dateRangePopoverOpen}>
					<PopoverTrigger>
						<Button
							variant="outline"
							class="w-full justify-start text-left font-normal"
							disabled={submitting}
						>
							<span class="material-symbols-rounded text-lg! mr-2">calendar_today</span>
							{dateRange ? formatDateRange(dateRange) : 'Seleccionar'}
						</Button>
					</PopoverTrigger>
					<PopoverContent class="w-auto p-0" align="start">
						<RangeCalendar
							bind:value={dateRange}
							onValueChange={() => {
								if (dateRange?.start && dateRange?.end) {
									dateRangePopoverOpen = false;
								}
							}}
						/>
					</PopoverContent>
				</Popover>
			</div>

			<div class="grid gap-2">
				<Label for="notes">Notas (opcional)</Label>
				<Textarea
					id="notes"
					bind:value={notes}
					placeholder="Añade información adicional..."
					disabled={submitting}
					rows={3}
				/>
			</div>

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
					disabled={submitting || success || loadingTypes}
					class="min-w-34"
				>
					{#if submitting}
						<span class="material-symbols-rounded animate-spin text-lg!">progress_activity</span>
					{:else if success}
						<span class="material-symbols-rounded text-lg! animate-in zoom-in duration-200"
							>check_circle</span
						>
					{:else}
						Enviar solicitud
					{/if}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

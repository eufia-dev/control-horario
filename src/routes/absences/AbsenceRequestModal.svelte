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
	import { Calendar as CalendarPicker } from '$lib/components/ui/calendar';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import {
		createAbsence,
		fetchAbsenceTypes,
		type AbsenceType,
		type AbsenceTypeOption
	} from '$lib/api/absences';
	import { onMount } from 'svelte';
	import { CalendarDate, today, getLocalTimeZone } from '@internationalized/date';

	type Props = {
		open: boolean;
		onClose: () => void;
		onSuccess: () => void;
	};

	let { open = $bindable(), onClose, onSuccess }: Props = $props();

	let absenceTypes = $state<AbsenceTypeOption[]>([]);
	let loadingTypes = $state(true);

	let selectedType = $state<AbsenceType | undefined>(undefined);
	let startDate = $state<CalendarDate | undefined>(undefined);
	let endDate = $state<CalendarDate | undefined>(undefined);
	let notes = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);

	let startDatePopoverOpen = $state(false);
	let endDatePopoverOpen = $state(false);

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
		startDate = undefined;
		endDate = undefined;
		notes = '';
		error = null;
	}

	$effect(() => {
		if (open) {
			resetForm();
			if (absenceTypes.length === 0) {
				loadAbsenceTypes();
			}
		}
	});

	function formatDate(date: CalendarDate): string {
		return new Date(date.year, date.month - 1, date.day).toLocaleDateString('es-ES', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function toISODate(date: CalendarDate): string {
		return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;

		if (!selectedType) {
			error = 'Selecciona un tipo de ausencia';
			return;
		}

		if (!startDate) {
			error = 'Selecciona la fecha de inicio';
			return;
		}

		if (!endDate) {
			error = 'Selecciona la fecha de fin';
			return;
		}

		if (endDate.compare(startDate) < 0) {
			error = 'La fecha de fin debe ser posterior a la fecha de inicio';
			return;
		}

		submitting = true;

		try {
			await createAbsence({
				type: selectedType,
				startDate: toISODate(startDate),
				endDate: toISODate(endDate),
				notes: notes.trim() || undefined
			});
			onSuccess();
			handleClose();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al solicitar la ausencia';
		} finally {
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

			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label>Fecha inicio</Label>
					<Popover bind:open={startDatePopoverOpen}>
						<PopoverTrigger>
							<Button
								variant="outline"
								class="w-full justify-start text-left font-normal"
								disabled={submitting}
							>
								<span class="material-symbols-rounded text-lg! mr-2">calendar_today</span>
								{startDate ? formatDate(startDate) : 'Seleccionar'}
							</Button>
						</PopoverTrigger>
						<PopoverContent class="w-auto p-0" align="start">
							<CalendarPicker
								type="single"
								bind:value={startDate}
								minValue={today(getLocalTimeZone())}
								onValueChange={() => {
									startDatePopoverOpen = false;
									if (startDate && (!endDate || endDate.compare(startDate) < 0)) {
										endDate = startDate;
									}
								}}
							/>
						</PopoverContent>
					</Popover>
				</div>

				<div class="grid gap-2">
					<Label>Fecha fin</Label>
					<Popover bind:open={endDatePopoverOpen}>
						<PopoverTrigger>
							<Button
								variant="outline"
								class="w-full justify-start text-left font-normal"
								disabled={submitting}
							>
								<span class="material-symbols-rounded text-lg! mr-2">calendar_today</span>
								{endDate ? formatDate(endDate) : 'Seleccionar'}
							</Button>
						</PopoverTrigger>
						<PopoverContent class="w-auto p-0" align="start">
							<CalendarPicker
								type="single"
								bind:value={endDate}
								minValue={startDate || today(getLocalTimeZone())}
								onValueChange={() => {
									endDatePopoverOpen = false;
								}}
							/>
						</PopoverContent>
					</Popover>
				</div>
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
				<Button type="button" variant="outline" onclick={handleClose} disabled={submitting}>
					Cancelar
				</Button>
				<Button type="submit" disabled={submitting || loadingTypes}>
					{#if submitting}
						<span class="material-symbols-rounded animate-spin text-lg!">progress_activity</span>
					{/if}
					Enviar solicitud
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

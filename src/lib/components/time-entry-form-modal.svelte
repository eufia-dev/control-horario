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
	import { Switch } from '$lib/components/ui/switch';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Calendar } from '$lib/components/ui/calendar';
	import * as Popover from '$lib/components/ui/popover';
	import {
		type DateValue,
		DateFormatter,
		getLocalTimeZone,
		CalendarDate
	} from '@internationalized/date';
	import { cn } from '$lib/utils';
	import {
		createTimeEntry,
		updateTimeEntry,
		type TimeEntry,
		type TimeEntryType,
		type CreateTimeEntryDto,
		type UpdateTimeEntryDto
	} from '$lib/api/time-entries';
	import type { Project } from '$lib/api/projects';

	type Props = {
		open: boolean;
		entry?: TimeEntry | null;
		projects: Project[];
		timeEntryTypes: TimeEntryType[];
		onClose: () => void;
		onSuccess: () => void;
	};

	let {
		open = $bindable(),
		entry = null,
		projects,
		timeEntryTypes,
		onClose,
		onSuccess
	}: Props = $props();

	const df = new DateFormatter('es-ES', {
		dateStyle: 'medium'
	});

	let projectId = $state<string | undefined>(undefined);
	let typeId = $state<string | undefined>(undefined);
	let startDateValue = $state<DateValue | undefined>(undefined);
	let startTime = $state('');
	let endDateValue = $state<DateValue | undefined>(undefined);
	let endTime = $state('');
	let minutes = $state(0);
	let isOffice = $state(true);
	let submitting = $state(false);
	let error = $state<string | null>(null);

	const isEditMode = $derived(entry !== null && entry !== undefined);
	const dialogTitle = $derived(isEditMode ? 'Editar Registro' : 'Nuevo Registro');
	const dialogDescription = $derived(
		isEditMode
			? 'Modifica los datos del registro de tiempo.'
			: 'Rellena los datos para crear un nuevo registro de tiempo.'
	);
	const submitLabel = $derived(isEditMode ? 'Guardar cambios' : 'Crear registro');

	const selectedProject = $derived(projects.find((p) => p.id === projectId));
	const selectedType = $derived(timeEntryTypes.find((t) => t.value === typeId));
	const activeProjects = $derived(projects.filter((p) => p.isActive));

	$effect(() => {
		if (startDateValue && startTime && endDateValue && endTime) {
			const startDateStr = dateValueToString(startDateValue);
			const endDateStr = dateValueToString(endDateValue);
			const start = new Date(`${startDateStr}T${startTime}`);
			const end = new Date(`${endDateStr}T${endTime}`);
			const diffMs = end.getTime() - start.getTime();
			if (diffMs > 0) {
				minutes = Math.round(diffMs / 60000);
			}
		}
	});

	function dateToDateValue(date: Date): DateValue {
		return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
	}

	function dateValueToString(dateValue: DateValue): string {
		const year = dateValue.year;
		const month = String(dateValue.month).padStart(2, '0');
		const day = String(dateValue.day).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function formatTimeForInput(dateString: string): string {
		const date = new Date(dateString);
		return date.toTimeString().slice(0, 5);
	}

	function resetForm() {
		projectId = undefined;
		typeId = undefined;
		startDateValue = undefined;
		startTime = '';
		endDateValue = undefined;
		endTime = '';
		minutes = 0;
		isOffice = true;
		error = null;
	}

	function populateForm() {
		if (entry) {
			projectId = entry.projectId;
			typeId = entry.typeId;
			startDateValue = dateToDateValue(new Date(entry.startedAt));
			startTime = formatTimeForInput(entry.startedAt);
			endDateValue = dateToDateValue(new Date(entry.endedAt));
			endTime = formatTimeForInput(entry.endedAt);
			minutes = entry.minutes;
			isOffice = entry.isOffice;
		} else {
			resetForm();
			const now = new Date();
			const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
			startDateValue = dateToDateValue(oneHourAgo);
			startTime = formatTimeForInput(oneHourAgo.toISOString());
			endDateValue = dateToDateValue(now);
			endTime = formatTimeForInput(now.toISOString());
			minutes = 60;

			if (activeProjects.length > 0) {
				projectId = activeProjects[0].id;
			}

			const trabajoType = timeEntryTypes.find((t) => t.name === 'Trabajo');
			if (trabajoType) {
				typeId = trabajoType.value;
			} else if (timeEntryTypes.length > 0) {
				typeId = timeEntryTypes[0].value;
			}
		}
	}

	$effect(() => {
		if (open) {
			populateForm();
		}
	});

	$effect(() => {
		if (!open) {
			resetForm();
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;

		if (!projectId) {
			error = 'Debes seleccionar un proyecto';
			return;
		}

		if (!typeId) {
			error = 'Debes seleccionar un tipo';
			return;
		}

		if (!startDateValue || !startTime) {
			error = 'La fecha y hora de inicio son obligatorias';
			return;
		}

		if (!endDateValue || !endTime) {
			error = 'La fecha y hora de fin son obligatorias';
			return;
		}

		const startDateStr = dateValueToString(startDateValue);
		const endDateStr = dateValueToString(endDateValue);
		const startedAt = new Date(`${startDateStr}T${startTime}`).toISOString();
		const endedAt = new Date(`${endDateStr}T${endTime}`).toISOString();

		if (new Date(endedAt) <= new Date(startedAt)) {
			error = 'La fecha de fin debe ser posterior a la de inicio';
			return;
		}

		submitting = true;

		try {
			if (isEditMode && entry) {
				const data: UpdateTimeEntryDto = {
					projectId,
					typeId,
					startedAt,
					endedAt,
					minutes,
					isOffice
				};
				await updateTimeEntry(entry.id, data);
			} else {
				const data: CreateTimeEntryDto = {
					projectId,
					typeId,
					startedAt,
					endedAt,
					minutes,
					isOffice
				};
				await createTimeEntry(data);
			}
			onSuccess();
			handleClose();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al guardar el registro';
		} finally {
			submitting = false;
		}
	}

	function handleClose() {
		open = false;
		onClose();
	}

	function formatDuration(mins: number): string {
		const hours = Math.floor(mins / 60);
		const m = mins % 60;
		if (hours > 0) {
			return `${hours}h ${m}m`;
		}
		return `${m}m`;
	}
</script>

<Dialog bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<DialogContent class="sm:max-w-lg">
		<DialogHeader>
			<DialogTitle>{dialogTitle}</DialogTitle>
			<DialogDescription>{dialogDescription}</DialogDescription>
		</DialogHeader>

		<form onsubmit={handleSubmit} class="grid gap-4 py-4">
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label>Proyecto</Label>
					<Select type="single" bind:value={projectId} disabled={submitting}>
						<SelectTrigger class="w-full">
							{#if selectedProject}
								{selectedProject.name}
							{:else}
								<span class="text-muted-foreground">Seleccionar proyecto</span>
							{/if}
						</SelectTrigger>
						<SelectContent>
							{#each activeProjects as project (project.id)}
								<SelectItem value={project.id} label={project.name} />
							{/each}
						</SelectContent>
					</Select>
				</div>

				<div class="grid gap-2">
					<Label>Tipo</Label>
					<Select type="single" bind:value={typeId} disabled={submitting}>
						<SelectTrigger class="w-full">
							{#if selectedType}
								{selectedType.name}
							{:else}
								<span class="text-muted-foreground">Seleccionar tipo</span>
							{/if}
						</SelectTrigger>
						<SelectContent>
							{#each timeEntryTypes as type (type.value)}
								<SelectItem value={type.value} label={type.name} />
							{/each}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label>Fecha inicio</Label>
					<Popover.Root>
						<Popover.Trigger class="w-full justify-start">
							{#snippet child({ props })}
								<Button
									variant="outline"
									class={cn(
										'w-full justify-start text-start font-normal',
										!startDateValue && 'text-muted-foreground'
									)}
									disabled={submitting}
									{...props}
								>
									<span class="material-symbols-rounded text-lg!">calendar_today</span>
									{startDateValue
										? df.format(startDateValue.toDate(getLocalTimeZone()))
										: 'Seleccionar fecha'}
								</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content class="w-auto p-0">
							<Calendar bind:value={startDateValue} type="single" initialFocus />
						</Popover.Content>
					</Popover.Root>
				</div>
				<div class="grid gap-2">
					<Label for="startTime">Hora inicio</Label>
					<Input type="time" bind:value={startTime} disabled={submitting} />
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label>Fecha fin</Label>
					<Popover.Root>
						<Popover.Trigger class="w-full justify-start">
							{#snippet child({ props })}
								<Button
									variant="outline"
									class={cn(
										'w-full justify-start text-start font-normal',
										!endDateValue && 'text-muted-foreground'
									)}
									disabled={submitting}
									{...props}
								>
									<span class="material-symbols-rounded text-lg!">calendar_today</span>
									{endDateValue
										? df.format(endDateValue.toDate(getLocalTimeZone()))
										: 'Seleccionar fecha'}
								</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content class="w-auto p-0">
							<Calendar bind:value={endDateValue} type="single" initialFocus />
						</Popover.Content>
					</Popover.Root>
				</div>
				<div class="grid gap-2">
					<Label for="startTime">Hora inicio</Label>
					<Input type="time" bind:value={startTime} disabled={submitting} />
				</div>
			</div>

			<div class="flex items-center justify-between flex-wrap gap-4 pt-2">
				<div class="flex items-center gap-3">
					<Switch id="isOfficeModal" bind:checked={isOffice} disabled={submitting} />
					<Label for="isOfficeModal" class="cursor-pointer">
						{isOffice ? 'Oficina' : 'Remoto'}
					</Label>
				</div>
				<div class="text-sm text-muted-foreground">
					Duración: <span class="font-medium text-foreground">{formatDuration(minutes)}</span>
				</div>
			</div>

			{#if error}
				<div class="text-sm text-destructive">{error}</div>
			{/if}

			<DialogFooter class="gap-2">
				<Button type="button" variant="outline" onclick={handleClose} disabled={submitting}>
					Cancelar
				</Button>
				<Button type="submit" disabled={submitting}>
					{#if submitting}
						<span class="material-symbols-rounded animate-spin text-lg!">progress_activity</span>
					{/if}
					{submitLabel}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

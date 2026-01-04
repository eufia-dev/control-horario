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
	import { type DateValue, getLocalTimeZone, CalendarDate } from '@internationalized/date';
	import { cn, formatProjectLabel } from '$lib/utils';
	import {
		createTimeEntry,
		updateTimeEntry,
		type TimeEntry,
		type TimeEntryType,
		type CreateTimeEntryDto,
		type UpdateTimeEntryDto
	} from '$lib/api/time-entries';
	import type { Project } from '$lib/api/projects';
	import ProjectLabel from '$lib/components/ProjectLabel.svelte';

	type Props = {
		open: boolean;
		entry?: TimeEntry | null;
		projects: Project[];
		timeEntryTypes: TimeEntryType[];
		latestProjectId?: string | null;
		initialDate?: string | null;
		onClose: () => void;
		onSuccess: () => void;
	};

	let {
		open = $bindable(),
		entry = null,
		projects,
		timeEntryTypes,
		latestProjectId = null,
		initialDate = null,
		onClose,
		onSuccess
	}: Props = $props();

	let projectId = $state<string | undefined>(undefined);
	let entryType = $state<string | undefined>(undefined);
	let startDateValue = $state<DateValue | undefined>(undefined);
	let startTime = $state('');
	let endDateValue = $state<DateValue | undefined>(undefined);
	let endTime = $state('');
	let durationMinutes = $state(0);
	let isInOffice = $state(true);
	let submitting = $state(false);
	let success = $state(false);
	let error = $state<string | null>(null);

	// Popover open states
	let startDatePopoverOpen = $state(false);
	let endDatePopoverOpen = $state(false);

	// Track previous start date to detect changes
	let previousStartDateValue = $state<DateValue | undefined>(undefined);

	const isEditMode = $derived(entry !== null && entry !== undefined);
	const dialogTitle = $derived(isEditMode ? 'Editar Registro' : 'Nuevo Registro');
	const dialogDescription = $derived(
		isEditMode
			? 'Modifica los datos del registro de tiempo.'
			: 'Rellena los datos para crear un nuevo registro de tiempo.'
	);
	const submitLabel = $derived(isEditMode ? 'Guardar cambios' : 'Crear registro');

	const selectedProject = $derived(projects.find((p) => p.id === projectId));
	const selectedType = $derived(timeEntryTypes.find((t) => t.value === entryType));
	const activeProjects = $derived(projects.filter((p) => p.isActive));
	const hasProjects = $derived(activeProjects.length > 0);
	const isWorkType = $derived(selectedType?.name === 'Trabajo');

	// Get the default project (latest from entries or first active)
	const defaultProjectId = $derived(() => {
		if (latestProjectId) {
			// Verify the project is still active
			const project = activeProjects.find((p) => p.id === latestProjectId);
			if (project) return latestProjectId;
		}
		return activeProjects.length > 0 ? activeProjects[0].id : undefined;
	});

	// Handle project selection when switching entry types
	$effect(() => {
		// Only for new entries (not editing)
		if (isEditMode) return;

		if (isWorkType && hasProjects && !projectId) {
			// Switching to work type: restore default project
			projectId = defaultProjectId();
		} else if ((!isWorkType || !hasProjects) && projectId) {
			// Switching away from work type or no projects: clear project
			projectId = undefined;
		}
	});

	$effect(() => {
		if (startDateValue && startTime && endDateValue && endTime) {
			const startDateStr = dateValueToString(startDateValue);
			const endDateStr = dateValueToString(endDateValue);
			const start = new Date(`${startDateStr}T${startTime}`);
			const end = new Date(`${endDateStr}T${endTime}`);
			const diffMs = end.getTime() - start.getTime();
			if (diffMs > 0) {
				durationMinutes = Math.round(diffMs / 60000);
			}
		}
	});

	$effect(() => {
		if (startDateValue) {
			const startChanged =
				previousStartDateValue &&
				(startDateValue.year !== previousStartDateValue.year ||
					startDateValue.month !== previousStartDateValue.month ||
					startDateValue.day !== previousStartDateValue.day);

			if (startChanged) {
				endDateValue = new CalendarDate(
					startDateValue.year,
					startDateValue.month,
					startDateValue.day
				);
			}

			previousStartDateValue = startDateValue;
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
		entryType = undefined;
		startDateValue = undefined;
		startTime = '';
		endDateValue = undefined;
		endTime = '';
		durationMinutes = 0;
		isInOffice = true;
		error = null;
		success = false;
		previousStartDateValue = undefined;
	}

	function populateForm() {
		if (entry) {
			projectId = entry.projectId;
			entryType = entry.entryType;
			startDateValue = dateToDateValue(new Date(entry.startTime));
			startTime = formatTimeForInput(entry.startTime);
			endDateValue = dateToDateValue(new Date(entry.endTime));
			endTime = formatTimeForInput(entry.endTime);
			durationMinutes = entry.durationMinutes;
			isInOffice = entry.isInOffice;
		} else {
			resetForm();

			// If initialDate is provided (from calendar click), use it for both start and end dates
			if (initialDate) {
				// Parse date string (YYYY-MM-DD) in local timezone
				const [y, m, d] = initialDate.split('-').map(Number);
				// Set times to a default range (e.g., 9:00 to 17:00)
				const startDateTime = new Date(y, m - 1, d, 9, 0, 0, 0);
				const endDateTime = new Date(y, m - 1, d, 17, 0, 0, 0);

				startDateValue = dateToDateValue(startDateTime);
				startTime = formatTimeForInput(startDateTime.toISOString());
				endDateValue = dateToDateValue(endDateTime);
				endTime = formatTimeForInput(endDateTime.toISOString());
				durationMinutes = 480; // 8 hours
			} else {
				// Default behavior: use current time
				const now = new Date();
				const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
				startDateValue = dateToDateValue(oneHourAgo);
				startTime = formatTimeForInput(oneHourAgo.toISOString());
				endDateValue = dateToDateValue(now);
				endTime = formatTimeForInput(now.toISOString());
				durationMinutes = 60;
			}

			const trabajoType = timeEntryTypes.find((t) => t.name === 'Trabajo');
			if (trabajoType) {
				entryType = trabajoType.value;
			} else if (timeEntryTypes.length > 0) {
				entryType = timeEntryTypes[0].value;
			}

			// Set default project (effect will handle this based on entry type)
			projectId = defaultProjectId();
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
		if (submitting || success) return;
		error = null;

		if (!entryType) {
			error = 'Debes seleccionar un tipo';
			return;
		}

		if (isWorkType && hasProjects && !projectId) {
			error = 'Debes seleccionar un proyecto';
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
		const startTimeIso = new Date(`${startDateStr}T${startTime}`).toISOString();
		const endTimeIso = new Date(`${endDateStr}T${endTime}`).toISOString();

		if (new Date(endTimeIso) <= new Date(startTimeIso)) {
			error = 'La fecha de fin debe ser posterior a la de inicio';
			return;
		}

		submitting = true;

		try {
			if (isEditMode && entry) {
				const data: UpdateTimeEntryDto = {
					projectId: isWorkType && hasProjects ? projectId : undefined,
					entryType,
					startTime: startTimeIso,
					endTime: endTimeIso,
					durationMinutes,
					isInOffice
				};
				await updateTimeEntry(entry.id, data);
			} else {
				const data: CreateTimeEntryDto = {
					projectId: isWorkType && hasProjects ? projectId : undefined,
					entryType,
					startTime: startTimeIso,
					endTime: endTimeIso,
					durationMinutes,
					isInOffice
				};
				await createTimeEntry(data);
			}
			submitting = false;
			success = true;
			onSuccess();
			// Small delay to show success animation before closing
			setTimeout(() => {
				open = false;
				onClose();
			}, 800);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al guardar el registro';
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
					<Label>Tipo</Label>
					<Select type="single" bind:value={entryType} disabled={submitting}>
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

				{#if isWorkType && hasProjects}
					<div class="grid gap-2">
						<Label>Proyecto</Label>
						<Select type="single" bind:value={projectId} disabled={submitting}>
							<SelectTrigger class="w-full min-w-0">
								<div class="flex min-w-0 items-center">
									{#if selectedProject}
										<ProjectLabel project={selectedProject} />
									{:else}
										<span class="text-muted-foreground">Seleccionar proyecto</span>
									{/if}
								</div>
							</SelectTrigger>
							<SelectContent>
								{#each activeProjects as project (project.id)}
									<SelectItem value={project.id} label={formatProjectLabel(project)}>
										<ProjectLabel {project} className="flex-1 min-w-0" />
									</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
				{/if}
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div class="flex flex-col gap-2">
					<Label class="px-1">Fecha inicio</Label>
					<Popover.Root bind:open={startDatePopoverOpen}>
						<Popover.Trigger>
							{#snippet child({ props })}
								<Button
									{...props}
									variant="outline"
									class={cn(
										'w-full justify-between font-normal',
										!startDateValue && 'text-muted-foreground'
									)}
									disabled={submitting}
								>
									{startDateValue
										? startDateValue.toDate(getLocalTimeZone()).toLocaleDateString('es-ES')
										: 'Seleccionar fecha'}
									<span class="material-symbols-rounded text-lg! opacity-50"
										>keyboard_arrow_down</span
									>
								</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content class="w-auto overflow-hidden p-0" align="start">
							<Calendar
								type="single"
								bind:value={startDateValue}
								onValueChange={() => {
									startDatePopoverOpen = false;
								}}
								captionLayout="dropdown"
							/>
						</Popover.Content>
					</Popover.Root>
				</div>
				<div class="flex flex-col gap-2">
					<Label for="startTime" class="px-1">Hora inicio</Label>
					<Input
						type="time"
						id="startTime"
						bind:value={startTime}
						disabled={submitting}
						class="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
					/>
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div class="flex flex-col gap-2">
					<Label class="px-1">Fecha fin</Label>
					<Popover.Root bind:open={endDatePopoverOpen}>
						<Popover.Trigger>
							{#snippet child({ props })}
								<Button
									{...props}
									variant="outline"
									class={cn(
										'w-full justify-between font-normal',
										!endDateValue && 'text-muted-foreground'
									)}
									disabled={submitting}
								>
									{endDateValue
										? endDateValue.toDate(getLocalTimeZone()).toLocaleDateString('es-ES')
										: 'Seleccionar fecha'}
									<span class="material-symbols-rounded text-lg! opacity-50"
										>keyboard_arrow_down</span
									>
								</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content class="w-auto overflow-hidden p-0" align="start">
							<Calendar
								type="single"
								bind:value={endDateValue}
								onValueChange={() => {
									endDatePopoverOpen = false;
								}}
								captionLayout="dropdown"
							/>
						</Popover.Content>
					</Popover.Root>
				</div>
				<div class="flex flex-col gap-2">
					<Label for="endTime" class="px-1">Hora fin</Label>
					<Input
						type="time"
						id="endTime"
						bind:value={endTime}
						disabled={submitting}
						class="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
					/>
				</div>
			</div>

			<div class="flex items-center justify-between flex-wrap gap-4 pt-2">
				<div class="flex items-center gap-3">
					<Switch id="IsInOfficeModal" bind:checked={isInOffice} disabled={submitting} />
					<Label for="IsInOfficeModal" class="cursor-pointer">
						{isInOffice ? 'Oficina' : 'Remoto'}
					</Label>
				</div>
				<div class="text-sm text-muted-foreground">
					Duración: <span class="font-medium text-foreground"
						>{formatDuration(durationMinutes)}</span
					>
				</div>
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
					disabled={submitting || success}
					class="min-w-[130px] transition-all duration-300"
				>
					{#if submitting}
						<span class="material-symbols-rounded animate-spin text-lg!">progress_activity</span>
						{submitLabel}
					{:else if success}
						<span class="material-symbols-rounded text-lg! animate-in zoom-in duration-200"
							>check_circle</span
						>
						Guardado
					{:else}
						{submitLabel}
					{/if}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

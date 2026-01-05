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
	import type { WorkScheduleDay } from '$lib/api/work-schedules';
	import ProjectLabel from '$lib/components/ProjectLabel.svelte';

	type Props = {
		open: boolean;
		entry?: TimeEntry | null;
		projects: Project[];
		timeEntryTypes: TimeEntryType[];
		latestProjectId?: string | null;
		initialDate?: string | null;
		daySchedule?: WorkScheduleDay | null;
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
		daySchedule = null,
		onClose,
		onSuccess
	}: Props = $props();

	// Segment type for multiple entries
	type TimeSegment = {
		id: string;
		projectId: string | undefined;
		entryType: string | undefined;
		startTime: string;
		endTime: string;
		isInOffice: boolean;
		startDatePopoverOpen: boolean;
		endDatePopoverOpen: boolean;
	};

	// For edit mode - single entry state
	let projectId = $state<string | undefined>(undefined);
	let entryType = $state<string | undefined>(undefined);
	let startDateValue = $state<DateValue | undefined>(undefined);
	let startTime = $state('');
	let endDateValue = $state<DateValue | undefined>(undefined);
	let endTime = $state('');
	let durationMinutes = $state(0);
	let isInOffice = $state(true);

	// For create mode - multiple segments
	let segments = $state<TimeSegment[]>([]);
	let baseDate = $state<DateValue | undefined>(undefined);
	let baseDatePopoverOpen = $state(false);

	let submitting = $state(false);
	let success = $state(false);
	let error = $state<string | null>(null);

	// Popover open states (for edit mode)
	let startDatePopoverOpen = $state(false);
	let endDatePopoverOpen = $state(false);

	// Track previous start date to detect changes (for edit mode)
	let previousStartDateValue = $state<DateValue | undefined>(undefined);

	const isEditMode = $derived(entry !== null && entry !== undefined);
	const dialogTitle = $derived(isEditMode ? 'Editar Registro' : 'Nuevo Registro');
	const dialogDescription = $derived(
		isEditMode
			? 'Modifica los datos del registro de tiempo.'
			: 'Añade uno o más registros de tiempo. Usa el botón + para añadir pausas o cambiar de proyecto.'
	);
	const submitLabel = $derived(
		isEditMode
			? 'Guardar cambios'
			: segments.length > 1
				? `Crear ${segments.length} registros`
				: 'Crear registro'
	);

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

	// Calculate total duration across all segments
	const totalDuration = $derived(() => {
		if (isEditMode) return durationMinutes;
		return segments.reduce((total, seg) => {
			if (seg.startTime && seg.endTime && baseDate) {
				const baseDateStr = dateValueToString(baseDate);
				const start = new Date(`${baseDateStr}T${seg.startTime}`);
				const end = new Date(`${baseDateStr}T${seg.endTime}`);
				const diffMs = end.getTime() - start.getTime();
				if (diffMs > 0) {
					return total + Math.round(diffMs / 60000);
				}
			}
			return total;
		}, 0);
	});

	// Helper to check if a segment type is work type
	function isSegmentWorkType(segment: TimeSegment): boolean {
		const type = timeEntryTypes.find((t) => t.value === segment.entryType);
		return type?.name === 'Trabajo';
	}

	// Helper to get segment duration
	function getSegmentDuration(segment: TimeSegment): number {
		if (segment.startTime && segment.endTime && baseDate) {
			const baseDateStr = dateValueToString(baseDate);
			const start = new Date(`${baseDateStr}T${segment.startTime}`);
			const end = new Date(`${baseDateStr}T${segment.endTime}`);
			const diffMs = end.getTime() - start.getTime();
			if (diffMs > 0) {
				return Math.round(diffMs / 60000);
			}
		}
		return 0;
	}

	// Handle project selection when switching entry types (edit mode)
	$effect(() => {
		// Only for edit mode
		if (!isEditMode) return;

		if (isWorkType && hasProjects && !projectId) {
			projectId = defaultProjectId();
		} else if ((!isWorkType || !hasProjects) && projectId) {
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

	function generateId(): string {
		return Math.random().toString(36).substring(2, 9);
	}

	function createDefaultSegment(startTimeValue?: string): TimeSegment {
		const trabajoType = timeEntryTypes.find((t) => t.name === 'Trabajo');
		return {
			id: generateId(),
			projectId: defaultProjectId(),
			entryType: trabajoType?.value ?? timeEntryTypes[0]?.value,
			startTime: startTimeValue ?? '09:00',
			endTime: startTimeValue ? addHoursToTime(startTimeValue, 4) : '13:00',
			isInOffice: true,
			startDatePopoverOpen: false,
			endDatePopoverOpen: false
		};
	}

	function addHoursToTime(time: string, hours: number): string {
		const [h, m] = time.split(':').map(Number);
		const totalMinutes = h * 60 + m + hours * 60;
		const newH = Math.floor(totalMinutes / 60) % 24;
		const newM = totalMinutes % 60;
		return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
	}

	function addSegment() {
		const lastSegment = segments[segments.length - 1];
		const newStartTime = lastSegment?.endTime ?? '09:00';
		segments = [...segments, createDefaultSegment(newStartTime)];
	}

	function removeSegment(id: string) {
		if (segments.length > 1) {
			segments = segments.filter((s) => s.id !== id);
		}
	}

	function updateSegment(id: string, updates: Partial<TimeSegment>) {
		segments = segments.map((s) => (s.id === id ? { ...s, ...updates } : s));
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
		segments = [];
		baseDate = undefined;
	}

	function populateForm() {
		if (entry) {
			// Edit mode - single entry
			projectId = entry.projectId;
			entryType = entry.entryType;
			startDateValue = dateToDateValue(new Date(entry.startTime));
			startTime = formatTimeForInput(entry.startTime);
			endDateValue = dateToDateValue(new Date(entry.endTime));
			endTime = formatTimeForInput(entry.endTime);
			durationMinutes = entry.durationMinutes;
			isInOffice = entry.isInOffice;
			segments = [];
		} else {
			// Create mode - multiple segments
			resetForm();

			const trabajoType = timeEntryTypes.find((t) => t.name === 'Trabajo');
			// For schedule breaks, always use "Pausa comida" (PAUSE_LUNCH), not coffee break
			const pausaComidaType = timeEntryTypes.find((t) => t.value === 'PAUSE_LUNCH');
			const defaultEntryType = trabajoType?.value ?? timeEntryTypes[0]?.value;

			if (initialDate) {
				const [y, m, d] = initialDate.split('-').map(Number);
				baseDate = new CalendarDate(y, m, d);
			} else {
				const now = new Date();
				baseDate = dateToDateValue(now);
			}

			// If we have a day schedule, use it to populate segments
			if (daySchedule) {
				const hasBreak = !!(daySchedule.breakStartTime && daySchedule.breakEndTime);

				if (hasBreak) {
					// Create 3 segments: work before break, break, work after break
					segments = [
						{
							id: generateId(),
							projectId: defaultProjectId(),
							entryType: defaultEntryType,
							startTime: daySchedule.startTime,
							endTime: daySchedule.breakStartTime!,
							isInOffice: true,
							startDatePopoverOpen: false,
							endDatePopoverOpen: false
						},
						{
							id: generateId(),
							projectId: undefined,
							entryType: pausaComidaType?.value ?? defaultEntryType,
							startTime: daySchedule.breakStartTime!,
							endTime: daySchedule.breakEndTime!,
							isInOffice: true,
							startDatePopoverOpen: false,
							endDatePopoverOpen: false
						},
						{
							id: generateId(),
							projectId: defaultProjectId(),
							entryType: defaultEntryType,
							startTime: daySchedule.breakEndTime!,
							endTime: daySchedule.endTime,
							isInOffice: true,
							startDatePopoverOpen: false,
							endDatePopoverOpen: false
						}
					];
				} else {
					// Single work segment for the whole day
					segments = [
						{
							id: generateId(),
							projectId: defaultProjectId(),
							entryType: defaultEntryType,
							startTime: daySchedule.startTime,
							endTime: daySchedule.endTime,
							isInOffice: true,
							startDatePopoverOpen: false,
							endDatePopoverOpen: false
						}
					];
				}
			} else {
				// No schedule - use defaults
				let defaultStartTime = '09:00';
				let defaultEndTime = '13:00';

				if (!initialDate) {
					// Use current time as reference
					const now = new Date();
					const currentHour = now.getHours();
					defaultStartTime = `${String(currentHour).padStart(2, '0')}:00`;
					defaultEndTime = `${String(Math.min(currentHour + 1, 23)).padStart(2, '0')}:00`;
				}

				// Initialize with one segment
				segments = [
					{
						id: generateId(),
						projectId: defaultProjectId(),
						entryType: defaultEntryType,
						startTime: defaultStartTime,
						endTime: defaultEndTime,
						isInOffice: true,
						startDatePopoverOpen: false,
						endDatePopoverOpen: false
					}
				];
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
		if (submitting || success) return;
		error = null;

		if (isEditMode) {
			// Edit mode validation
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
				const data: UpdateTimeEntryDto = {
					projectId: isWorkType && hasProjects ? projectId : undefined,
					entryType,
					startTime: startTimeIso,
					endTime: endTimeIso,
					durationMinutes,
					isInOffice
				};
				await updateTimeEntry(entry!.id, data);
				submitting = false;
				success = true;
				onSuccess();
				setTimeout(() => {
					open = false;
					onClose();
				}, 800);
			} catch (e) {
				error = e instanceof Error ? e.message : 'Error al guardar el registro';
				submitting = false;
			}
		} else {
			// Create mode - validate all segments
			if (!baseDate) {
				error = 'Debes seleccionar una fecha';
				return;
			}

			for (let i = 0; i < segments.length; i++) {
				const seg = segments[i];
				if (!seg.entryType) {
					error = `Segmento ${i + 1}: Debes seleccionar un tipo`;
					return;
				}

				const segIsWorkType = isSegmentWorkType(seg);
				if (segIsWorkType && hasProjects && !seg.projectId) {
					error = `Segmento ${i + 1}: Debes seleccionar un proyecto`;
					return;
				}

				if (!seg.startTime || !seg.endTime) {
					error = `Segmento ${i + 1}: Las horas de inicio y fin son obligatorias`;
					return;
				}

				const baseDateStr = dateValueToString(baseDate);
				const startDt = new Date(`${baseDateStr}T${seg.startTime}`);
				const endDt = new Date(`${baseDateStr}T${seg.endTime}`);

				if (endDt <= startDt) {
					error = `Segmento ${i + 1}: La hora de fin debe ser posterior a la de inicio`;
					return;
				}
			}

			submitting = true;

			try {
				const baseDateStr = dateValueToString(baseDate);

				// Create all entries
				for (const seg of segments) {
					const startTimeIso = new Date(`${baseDateStr}T${seg.startTime}`).toISOString();
					const endTimeIso = new Date(`${baseDateStr}T${seg.endTime}`).toISOString();
					const segDuration = getSegmentDuration(seg);
					const segIsWorkType = isSegmentWorkType(seg);

					const data: CreateTimeEntryDto = {
						projectId: segIsWorkType && hasProjects ? seg.projectId : undefined,
						entryType: seg.entryType!,
						startTime: startTimeIso,
						endTime: endTimeIso,
						durationMinutes: segDuration,
						isInOffice: seg.isInOffice
					};
					await createTimeEntry(data);
				}

				submitting = false;
				success = true;
				onSuccess();
				setTimeout(() => {
					open = false;
					onClose();
				}, 800);
			} catch (e) {
				error = e instanceof Error ? e.message : 'Error al guardar los registros';
				submitting = false;
			}
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
	<DialogContent class="sm:max-w-lg max-h-[90vh] overflow-y-auto">
		<DialogHeader>
			<DialogTitle>{dialogTitle}</DialogTitle>
			<DialogDescription>{dialogDescription}</DialogDescription>
		</DialogHeader>

		<form onsubmit={handleSubmit} class="grid gap-4 py-4">
			{#if isEditMode}
				<!-- Edit mode: single entry form -->
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
			{:else}
				<!-- Create mode: multiple segments -->
				<div class="flex flex-col gap-2">
					<Label class="px-1">Fecha</Label>
					<Popover.Root bind:open={baseDatePopoverOpen}>
						<Popover.Trigger>
							{#snippet child({ props })}
								<Button
									{...props}
									variant="outline"
									class={cn(
										'w-full justify-between font-normal',
										!baseDate && 'text-muted-foreground'
									)}
									disabled={submitting}
								>
									{baseDate
										? baseDate.toDate(getLocalTimeZone()).toLocaleDateString('es-ES', {
												weekday: 'long',
												year: 'numeric',
												month: 'long',
												day: 'numeric'
											})
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
								bind:value={baseDate}
								onValueChange={() => {
									baseDatePopoverOpen = false;
								}}
								captionLayout="dropdown"
							/>
						</Popover.Content>
					</Popover.Root>
				</div>

				<!-- Segments list -->
				<div class="flex flex-col gap-3">
					{#each segments as segment, index (segment.id)}
						{@const segmentType = timeEntryTypes.find((t) => t.value === segment.entryType)}
						{@const segmentProject = activeProjects.find((p) => p.id === segment.projectId)}
						{@const segmentIsWorkType = segmentType?.name === 'Trabajo'}
						{@const segmentDuration = getSegmentDuration(segment)}

						<div
							class="relative rounded-lg border bg-card p-4 transition-all hover:border-primary/30"
						>
							{#if segments.length > 1}
								<button
									type="button"
									onclick={() => removeSegment(segment.id)}
									class="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 transition-colors"
									disabled={submitting}
								>
									<span class="material-symbols-rounded text-sm!">close</span>
								</button>
							{/if}

							<!-- Segment header with number -->
							<div class="mb-3 flex items-center gap-2">
								<span
									class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary"
								>
									{index + 1}
								</span>
								<span class="text-sm text-muted-foreground">
									{segmentDuration > 0 ? formatDuration(segmentDuration) : '—'}
								</span>
							</div>

							<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div class="grid gap-1.5">
									<Label class="text-xs">Tipo</Label>
									<Select
										type="single"
										value={segment.entryType}
										onValueChange={(v) => {
											const newType = timeEntryTypes.find((t) => t.value === v);
											const isWork = newType?.name === 'Trabajo';
											updateSegment(segment.id, {
												entryType: v,
												projectId:
													isWork && hasProjects
														? segment.projectId || defaultProjectId()
														: undefined
											});
										}}
										disabled={submitting}
									>
										<SelectTrigger class="w-full h-9">
											{#if segmentType}
												{segmentType.name}
											{:else}
												<span class="text-muted-foreground">Tipo</span>
											{/if}
										</SelectTrigger>
										<SelectContent>
											{#each timeEntryTypes as type (type.value)}
												<SelectItem value={type.value} label={type.name} />
											{/each}
										</SelectContent>
									</Select>
								</div>

								{#if segmentIsWorkType && hasProjects}
									<div class="grid gap-1.5">
										<Label class="text-xs">Proyecto</Label>
										<Select
											type="single"
											value={segment.projectId}
											onValueChange={(v) => updateSegment(segment.id, { projectId: v })}
											disabled={submitting}
										>
											<SelectTrigger class="w-full h-9 min-w-0">
												<div class="flex min-w-0 items-center">
													{#if segmentProject}
														<ProjectLabel project={segmentProject} />
													{:else}
														<span class="text-muted-foreground">Proyecto</span>
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

							<div class="mt-3 grid grid-cols-2 gap-3">
								<div class="grid gap-1.5">
									<Label class="text-xs">Inicio</Label>
									<Input
										type="time"
										value={segment.startTime}
										oninput={(e) => updateSegment(segment.id, { startTime: e.currentTarget.value })}
										disabled={submitting}
										class="h-9 bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
									/>
								</div>
								<div class="grid gap-1.5">
									<Label class="text-xs">Fin</Label>
									<Input
										type="time"
										value={segment.endTime}
										oninput={(e) => updateSegment(segment.id, { endTime: e.currentTarget.value })}
										disabled={submitting}
										class="h-9 bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
									/>
								</div>
							</div>

							<div class="mt-3 flex items-center gap-3">
								<Switch
									id={`isInOffice-${segment.id}`}
									checked={segment.isInOffice}
									onCheckedChange={(checked) => updateSegment(segment.id, { isInOffice: checked })}
									disabled={submitting}
								/>
								<Label for={`isInOffice-${segment.id}`} class="cursor-pointer text-sm">
									{segment.isInOffice ? 'Oficina' : 'Remoto'}
								</Label>
							</div>
						</div>
					{/each}
				</div>

				<!-- Add segment button -->
				<button
					type="button"
					onclick={addSegment}
					disabled={submitting}
					class="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 py-3 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary hover:bg-primary/5"
				>
					<span class="material-symbols-rounded text-xl!">add</span>
					<span class="text-sm font-medium">Añadir segmento</span>
				</button>

				<!-- Total duration -->
				<div class="flex items-center justify-end pt-2">
					<div class="text-sm text-muted-foreground">
						Duración total: <span class="font-medium text-foreground"
							>{formatDuration(totalDuration())}</span
						>
					</div>
				</div>
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

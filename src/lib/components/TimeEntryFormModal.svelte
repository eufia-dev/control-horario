<script lang="ts">
	import {
		Dialog,
		DialogContent,
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
	import { type DateValue, getLocalTimeZone, CalendarDate, today } from '@internationalized/date';
	import { cn, formatProjectLabel } from '$lib/utils';

	// Max date is today (no future entries allowed)
	const maxDate = today(getLocalTimeZone());
	import {
		createTimeEntry,
		updateTimeEntry,
		deleteTimeEntry,
		fetchTimeEntriesByDate,
		type TimeEntry,
		type TimeEntryType,
		type CreateTimeEntryDto,
		type UpdateTimeEntryDto
	} from '$lib/api/time-entries';
	import type { Project } from '$lib/api/projects';
	import {
		fetchMyEffectiveSchedule,
		type WorkScheduleDay,
		type WorkScheduleResponse
	} from '$lib/api/work-schedules';
	import ProjectLabel from '$lib/components/ProjectLabel.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';

	type Props = {
		open: boolean;
		entry?: TimeEntry | null;
		projects: Project[];
		timeEntryTypes: TimeEntryType[];
		latestProjectId?: string | null;
		initialDate?: string | null;
		// Optional: pre-fetched work schedule (all days) to avoid extra API call
		workSchedule?: WorkScheduleResponse | null;
		// Optional: pre-fetched entries for the day to avoid extra API call
		existingEntries?: TimeEntry[] | null;
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
		workSchedule = null,
		existingEntries = null,
		onClose,
		onSuccess
	}: Props = $props();

	// Internal schedule state (fetched once if not provided via props)
	let internalWorkSchedule = $state<WorkScheduleResponse | null>(null);
	let scheduleLoaded = $state(false);

	// Get the current effective schedule (prop or fetched)
	function getEffectiveSchedule(): WorkScheduleResponse | null {
		return workSchedule ?? internalWorkSchedule;
	}

	// Get schedule for a specific date
	function getScheduleForDate(dateValue: DateValue | undefined): WorkScheduleDay | null {
		const schedule = getEffectiveSchedule();
		if (!dateValue || !schedule) return null;

		// Convert DateValue to JS Date to get day of week
		const jsDate = dateValue.toDate(getLocalTimeZone());
		// JS: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
		// API: 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
		const jsDayOfWeek = jsDate.getDay();
		const apiDayOfWeek = jsDayOfWeek === 0 ? 6 : jsDayOfWeek - 1;

		const day = schedule.days.find((d) => d.dayOfWeek === apiDayOfWeek);
		// Return null if day doesn't exist OR is not workable
		if (!day || day.isWorkable === false) return null;
		return day;
	}

	// Track if schedule is currently being loaded
	let scheduleLoadingPromise = $state<Promise<void> | null>(null);

	// Load schedule if not provided via props (non-blocking, runs in background)
	function startScheduleLoading() {
		if (workSchedule || scheduleLoaded || scheduleLoadingPromise) return;

		scheduleLoadingPromise = (async () => {
			try {
				internalWorkSchedule = await fetchMyEffectiveSchedule();
			} catch (e) {
				console.error('Error loading work schedule:', e);
			} finally {
				scheduleLoaded = true;
				scheduleLoadingPromise = null;
			}
		})();
	}

	// Wait for schedule to be loaded (used when adding segments)
	async function waitForSchedule(): Promise<void> {
		if (workSchedule || scheduleLoaded) return;
		if (scheduleLoadingPromise) {
			await scheduleLoadingPromise;
		}
	}

	// Check if schedule is available (either from prop or loaded)
	function isScheduleAvailable(): boolean {
		return !!(workSchedule || internalWorkSchedule);
	}

	// Segment type for multiple entries
	type TimeSegment = {
		id: string;
		originalEntryId?: string; // Track if this segment is from an existing entry (for edit mode)
		projectId: string | undefined;
		entryType: string | undefined;
		startTime: string;
		endTime: string;
		isInOffice: boolean;
	};

	// Unified state for both create and edit modes
	let segments = $state<TimeSegment[]>([]);
	let baseDate = $state<DateValue | undefined>(undefined);
	let baseDatePopoverOpen = $state(false);

	// Track original entry IDs to detect deletions
	let originalEntryIds = $state<Set<string>>(new Set());

	let loading = $state(false);
	let addingSegment = $state(false); // Loading state for when waiting for schedule
	let submitting = $state(false);
	let success = $state(false);
	let error = $state<string | null>(null);

	const hasExistingEntries = $derived(originalEntryIds.size > 0);
	const dialogTitle = $derived(hasExistingEntries ? 'Registros del día' : 'Nuevo Registro');

	const activeProjects = $derived(projects.filter((p) => p.isActive));
	const hasProjects = $derived(activeProjects.length > 0);

	// Get the default project (latest from entries or first active)
	const defaultProjectId = $derived(() => {
		if (latestProjectId) return latestProjectId;
		return activeProjects.length > 0 ? activeProjects[0].id : undefined;
	});

	// Calculate total duration across all segments
	const totalDuration = $derived(() => {
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

	function addHoursToTime(time: string, hours: number): string {
		const [h, m] = time.split(':').map(Number);
		const totalMinutes = h * 60 + m + hours * 60;
		const newH = Math.floor(totalMinutes / 60) % 24;
		const newM = totalMinutes % 60;
		return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
	}

	async function addSegment() {
		const trabajoType = timeEntryTypes.find((t) => t.name === 'Trabajo');
		const pausaComidaType = timeEntryTypes.find((t) => t.value === 'PAUSE_LUNCH');
		const defaultWorkType = trabajoType?.value ?? timeEntryTypes[0]?.value;

		// Wait for schedule if still loading (only blocks if not ready yet)
		if (!isScheduleAvailable() && scheduleLoadingPromise) {
			addingSegment = true;
			await waitForSchedule();
			addingSegment = false;
		}

		// Compute schedule directly (not relying on derived value inside function)
		const schedule = getScheduleForDate(baseDate);
		const hasScheduleBreak = schedule && schedule.breakStartTime && schedule.breakEndTime;
		const segmentCount = segments.length;

		// Only use schedule-based template if there are no existing entries for this day
		// (i.e., starting fresh on an empty day)
		const useScheduleTemplate = originalEntryIds.size === 0 && schedule;

		let newSegment: TimeSegment;

		if (useScheduleTemplate && segmentCount === 0) {
			// First segment with schedule: morning work (start → breakStart or end)
			newSegment = {
				id: generateId(),
				projectId: defaultProjectId(),
				entryType: defaultWorkType,
				startTime: schedule.startTime,
				endTime: hasScheduleBreak ? schedule.breakStartTime! : schedule.endTime,
				isInOffice: true
			};
		} else if (useScheduleTemplate && segmentCount === 1 && hasScheduleBreak) {
			// Second segment with break: the break itself
			newSegment = {
				id: generateId(),
				projectId: undefined, // Breaks don't have projects
				entryType: pausaComidaType?.value ?? defaultWorkType,
				startTime: schedule.breakStartTime!,
				endTime: schedule.breakEndTime!,
				isInOffice: true
			};
		} else if (useScheduleTemplate && segmentCount === 2 && hasScheduleBreak) {
			// Third segment with break: afternoon work (breakEnd → end)
			newSegment = {
				id: generateId(),
				projectId: defaultProjectId(),
				entryType: defaultWorkType,
				startTime: schedule.breakEndTime!,
				endTime: schedule.endTime,
				isInOffice: true
			};
		} else {
			// Existing entries, no schedule, or beyond schedule pattern: continue from last segment or use defaults
			const lastSegment = segments[segments.length - 1];

			let startTime: string;
			let endTime: string;

			if (lastSegment) {
				// Continue from last segment
				startTime = lastSegment.endTime;
				endTime = addHoursToTime(startTime, 1);
			} else {
				// No segments and no schedule - use today-based defaults
				const now = new Date();
				const isToday =
					baseDate &&
					baseDate.year === now.getFullYear() &&
					baseDate.month === now.getMonth() + 1 &&
					baseDate.day === now.getDate();

				if (isToday) {
					const currentHour = now.getHours();
					startTime = `${String(currentHour).padStart(2, '0')}:00`;
					endTime = `${String(Math.min(currentHour + 1, 23)).padStart(2, '0')}:00`;
				} else {
					startTime = '09:00';
					endTime = '13:00';
				}
			}

			newSegment = {
				id: generateId(),
				projectId: defaultProjectId(),
				entryType: defaultWorkType,
				startTime,
				endTime,
				isInOffice: true
			};
		}

		segments = [...segments, newSegment];
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
		error = null;
		success = false;
		segments = [];
		baseDate = undefined;
		originalEntryIds = new Set();
		loading = false;
		addingSegment = false;
		// Don't reset internalWorkSchedule/scheduleLoaded - keep it cached
	}

	// Convert TimeEntry array to segments
	function entriesToSegments(entries: TimeEntry[]): TimeSegment[] {
		return entries
			.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
			.map((e) => ({
				id: generateId(),
				originalEntryId: e.id,
				projectId: e.projectId ?? undefined,
				entryType: e.entryType,
				startTime: formatTimeForInput(e.startTime),
				endTime: formatTimeForInput(e.endTime),
				isInOffice: e.isInOffice
			}));
	}

	// Fetch all entries for a date and populate segments
	// If existingEntries is provided and matches the date, use those instead of fetching
	async function loadEntriesForDate(dateStr: string, useExistingEntries: boolean = false) {
		loading = true;
		error = null;

		try {
			let entries: TimeEntry[];

			if (useExistingEntries && existingEntries && existingEntries.length > 0) {
				// Filter existing entries to only include those for the target date
				entries = existingEntries.filter((e) => {
					const entryDate = new Date(e.startTime);
					const entryDateStr = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}-${String(entryDate.getDate()).padStart(2, '0')}`;
					return entryDateStr === dateStr;
				});
			} else {
				// Fetch from API
				entries = await fetchTimeEntriesByDate(dateStr);
			}

			if (entries.length > 0) {
				// We have existing entries - show them all
				segments = entriesToSegments(entries);
				originalEntryIds = new Set(entries.map((e) => e.id));
			} else {
				// No entries for this date - create default segments
				createDefaultSegments();
			}
		} catch (e) {
			console.error('Error loading entries for date:', e);
			// On error, create default segments
			createDefaultSegments();
		} finally {
			loading = false;
		}
	}

	// When no entries exist for a day, start with empty segments
	// User will click "Add segment" to create entries
	function createDefaultSegments() {
		segments = [];
		originalEntryIds = new Set();
	}

	async function populateForm() {
		resetForm();

		// Start loading schedule in background (non-blocking)
		// It will be ready by the time user clicks "Add segment"
		startScheduleLoading();

		// Determine the date to use
		let dateStr: string;
		let canUseExistingEntries = false;

		if (entry) {
			// Edit mode - use the entry's date
			// We CAN use existingEntries since the entry being edited is from the loaded data
			const entryDate = new Date(entry.startTime);
			baseDate = dateToDateValue(entryDate);
			dateStr = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}-${String(entryDate.getDate()).padStart(2, '0')}`;
			canUseExistingEntries = existingEntries !== null && existingEntries !== undefined;
		} else if (initialDate) {
			// Create mode with initial date (e.g., from calendar)
			// Check if initialDate falls within the loaded entries' date range
			const [y, m, d] = initialDate.split('-').map(Number);
			baseDate = new CalendarDate(y, m, d);
			dateStr = initialDate;
			// Only use existing entries if they contain data for this month
			if (existingEntries && existingEntries.length > 0) {
				const firstEntryDate = new Date(existingEntries[0].startTime);
				canUseExistingEntries =
					firstEntryDate.getFullYear() === y && firstEntryDate.getMonth() + 1 === m;
			}
		} else {
			// Create mode without initial date - use today
			// Don't use existingEntries as they might be for a different month
			const now = new Date();
			baseDate = dateToDateValue(now);
			dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
			// Only use existing entries if they contain data for this month (today's month)
			if (existingEntries && existingEntries.length > 0) {
				const firstEntryDate = new Date(existingEntries[0].startTime);
				canUseExistingEntries =
					firstEntryDate.getFullYear() === now.getFullYear() &&
					firstEntryDate.getMonth() === now.getMonth();
			}
		}

		// Load entries for this date
		await loadEntriesForDate(dateStr, canUseExistingEntries);
	}

	// Handle date change - reload entries for the new date
	async function handleDateChange() {
		if (!baseDate) return;

		const dateStr = dateValueToString(baseDate);
		await loadEntriesForDate(dateStr);
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

		// Validate base date
		if (!baseDate) {
			error = 'Debes seleccionar una fecha';
			return;
		}

		// Validate not in the future
		const todayDate = new Date();
		todayDate.setHours(23, 59, 59, 999);
		if (baseDate.toDate(getLocalTimeZone()) > todayDate) {
			error = 'No se pueden crear registros para días futuros';
			return;
		}

		// Validate we have at least one segment
		if (segments.length === 0) {
			error = 'Debes añadir al menos un registro';
			return;
		}

		// Validate all segments
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

			// Find entries to delete (original entries that are no longer in segments)
			const currentEntryIds = new Set(
				segments.filter((s) => s.originalEntryId).map((s) => s.originalEntryId!)
			);
			const entriesToDelete = [...originalEntryIds].filter((id) => !currentEntryIds.has(id));

			// Delete removed entries
			for (const entryId of entriesToDelete) {
				await deleteTimeEntry(entryId);
			}

			// Process all segments (update existing, create new)
			for (const seg of segments) {
				const startTimeIso = new Date(`${baseDateStr}T${seg.startTime}`).toISOString();
				const endTimeIso = new Date(`${baseDateStr}T${seg.endTime}`).toISOString();
				const segDuration = getSegmentDuration(seg);
				const segIsWorkType = isSegmentWorkType(seg);

				if (seg.originalEntryId) {
					// Update existing entry
					const data: UpdateTimeEntryDto = {
						projectId: segIsWorkType && hasProjects ? seg.projectId : undefined,
						entryType: seg.entryType!,
						startTime: startTimeIso,
						endTime: endTimeIso,
						durationMinutes: segDuration,
						isInOffice: seg.isInOffice
					};
					await updateTimeEntry(seg.originalEntryId, data);
				} else {
					// Create new entry
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
		</DialogHeader>

		<form onsubmit={handleSubmit} class="grid gap-4 py-4">
			<!-- Date picker -->
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
								<span class="material-symbols-rounded text-lg! opacity-50">keyboard_arrow_down</span
								>
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-auto overflow-hidden p-0" align="start">
						<Calendar
							type="single"
							bind:value={baseDate}
							maxValue={maxDate}
							onValueChange={() => {
								baseDatePopoverOpen = false;
								handleDateChange();
							}}
							captionLayout="dropdown"
						/>
					</Popover.Content>
				</Popover.Root>
			</div>

			<!-- Segments list -->
			<div class="flex flex-col gap-3">
				{#if loading}
					<!-- Loading skeletons -->
					{#each [1, 2] as i (i)}
						<div class="rounded-lg border bg-card p-4">
							<div class="mb-3 flex items-center gap-2">
								<Skeleton class="h-6 w-6 rounded-full" />
								<Skeleton class="h-4 w-16" />
							</div>
							<div class="grid grid-cols-2 gap-3">
								<Skeleton class="h-9" />
								<Skeleton class="h-9" />
							</div>
							<div class="mt-3 grid grid-cols-2 gap-3">
								<Skeleton class="h-9" />
								<Skeleton class="h-9" />
							</div>
							<div class="mt-3 flex items-center gap-3">
								<Skeleton class="h-5 w-9 rounded-full" />
								<Skeleton class="h-4 w-16" />
							</div>
						</div>
					{/each}
				{:else if segments.length === 0}
					<!-- Empty state -->
					<div
						class="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed rounded-lg"
					>
						<span class="material-symbols-rounded text-4xl! mb-2 opacity-50">schedule</span>
						<p class="text-sm">No hay registros para este día</p>
					</div>
				{:else}
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
									class="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:"
									disabled={submitting}
									onclick={() => removeSegment(segment.id)}
								>
									<span class="material-symbols-rounded text-sm! pl-px">close</span>
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
				{/if}
			</div>

			<!-- Add segment button -->
			{#if !loading}
				<button
					type="button"
					onclick={addSegment}
					disabled={submitting || addingSegment}
					class="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 py-3 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary hover:bg-primary/5"
				>
					{#if addingSegment}
						<span class="material-symbols-rounded text-xl! animate-spin">progress_activity</span>
					{:else}
						<span class="material-symbols-rounded text-xl!">add</span>
					{/if}
					<span class="text-sm font-medium">Añadir segmento</span>
				</button>
			{/if}

			<!-- Total duration -->
			<div class="flex items-center justify-end pt-2">
				<div class="text-sm text-muted-foreground">
					Duración total: <span class="font-medium text-foreground"
						>{formatDuration(totalDuration())}</span
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
					disabled={loading || submitting || success}
					class="min-w-22"
				>
					{#if submitting}
						<span class="material-symbols-rounded animate-spin text-lg!">progress_activity</span>
					{:else if success}
						<span class="material-symbols-rounded text-lg! animate-in zoom-in duration-200"
							>check_circle</span
						>
					{:else}
						Guardar
					{/if}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

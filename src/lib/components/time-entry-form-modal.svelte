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
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger
	} from '$lib/components/ui/select';
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

	let projectId = $state<string | undefined>(undefined);
	let typeId = $state<string | undefined>(undefined);
	let startDate = $state('');
	let startTime = $state('');
	let endDate = $state('');
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
	const selectedType = $derived(timeEntryTypes.find((t) => t.id === typeId));
	const activeProjects = $derived(projects.filter((p) => p.isActive));

	// Calculate minutes from start/end times
	$effect(() => {
		if (startDate && startTime && endDate && endTime) {
			const start = new Date(`${startDate}T${startTime}`);
			const end = new Date(`${endDate}T${endTime}`);
			const diffMs = end.getTime() - start.getTime();
			if (diffMs > 0) {
				minutes = Math.round(diffMs / 60000);
			}
		}
	});

	function formatDateForInput(dateString: string): string {
		const date = new Date(dateString);
		return date.toISOString().split('T')[0];
	}

	function formatTimeForInput(dateString: string): string {
		const date = new Date(dateString);
		return date.toTimeString().slice(0, 5);
	}

	function resetForm() {
		projectId = undefined;
		typeId = undefined;
		startDate = '';
		startTime = '';
		endDate = '';
		endTime = '';
		minutes = 0;
		isOffice = true;
		error = null;
	}

	function populateForm() {
		if (entry) {
			projectId = entry.projectId;
			typeId = entry.typeId;
			startDate = formatDateForInput(entry.startedAt);
			startTime = formatTimeForInput(entry.startedAt);
			endDate = formatDateForInput(entry.endedAt);
			endTime = formatTimeForInput(entry.endedAt);
			minutes = entry.minutes;
			isOffice = entry.isOffice;
		} else {
			resetForm();
			// Set defaults for new entry
			const now = new Date();
			const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
			startDate = formatDateForInput(oneHourAgo.toISOString());
			startTime = formatTimeForInput(oneHourAgo.toISOString());
			endDate = formatDateForInput(now.toISOString());
			endTime = formatTimeForInput(now.toISOString());
			minutes = 60;

			if (activeProjects.length > 0) {
				projectId = activeProjects[0].id;
			}
			
			const trabajoType = timeEntryTypes.find((t) => t.name === 'Trabajo');
			if (trabajoType) {
				typeId = trabajoType.id;
			} else if (timeEntryTypes.length > 0) {
				typeId = timeEntryTypes[0].id;
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

		if (!startDate || !startTime) {
			error = 'La fecha y hora de inicio son obligatorias';
			return;
		}

		if (!endDate || !endTime) {
			error = 'La fecha y hora de fin son obligatorias';
			return;
		}

		const startedAt = new Date(`${startDate}T${startTime}`).toISOString();
		const endedAt = new Date(`${endDate}T${endTime}`).toISOString();

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
							{#each timeEntryTypes as type (type.id)}
								<SelectItem value={type.id} label={type.name} />
							{/each}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label for="startDate">Fecha inicio</Label>
					<Input id="startDate" type="date" bind:value={startDate} disabled={submitting} />
				</div>
				<div class="grid gap-2">
					<Label for="startTime">Hora inicio</Label>
					<Input id="startTime" type="time" bind:value={startTime} disabled={submitting} />
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label for="endDate">Fecha fin</Label>
					<Input id="endDate" type="date" bind:value={endDate} disabled={submitting} />
				</div>
				<div class="grid gap-2">
					<Label for="endTime">Hora fin</Label>
					<Input id="endTime" type="time" bind:value={endTime} disabled={submitting} />
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
						<span class="material-symbols-rounded mr-2 animate-spin text-base">progress_activity</span>
					{/if}
					{submitLabel}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>


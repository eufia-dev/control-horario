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
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Calendar } from '$lib/components/ui/calendar';
	import * as Popover from '$lib/components/ui/popover';
	import {
		type DateValue,
		DateFormatter,
		getLocalTimeZone,
		CalendarDate
	} from '@internationalized/date';
	import { cn, formatProjectLabel } from '$lib/utils';
	import {
		createExternalHours,
		updateExternalHours,
		type External,
		type ExternalHours,
		type CreateExternalHoursDto,
		type UpdateExternalHoursDto
	} from '$lib/api/externals';
	import type { Project } from '$lib/api/projects';
	import ProjectLabel from '$lib/components/project-label.svelte';

	type Props = {
		open: boolean;
		entry?: ExternalHours | null;
		externals: External[];
		projects: Project[];
		onClose: () => void;
		onSuccess: () => void;
	};

	let {
		open = $bindable(),
		entry = null,
		externals,
		projects,
		onClose,
		onSuccess
	}: Props = $props();

	const df = new DateFormatter('es-ES', {
		dateStyle: 'medium'
	});

	let externalId = $state<string | undefined>(undefined);
	let projectId = $state<string | undefined>(undefined);
	let dateValue = $state<DateValue | undefined>(undefined);
	let hours = $state(0);
	let minutesInput = $state(0);
	let submitting = $state(false);
	let error = $state<string | null>(null);

	const isEditMode = $derived(entry !== null && entry !== undefined);
	const dialogTitle = $derived(isEditMode ? 'Editar Horas Externo' : 'Nuevas Horas Externo');
	const dialogDescription = $derived(
		isEditMode
			? 'Modifica los datos de las horas del externo.'
			: 'Rellena los datos para registrar horas de un externo.'
	);
	const submitLabel = $derived(isEditMode ? 'Guardar cambios' : 'Crear registro');

	const selectedExternal = $derived(externals.find((e) => e.id === externalId));
	const selectedProject = $derived(projects.find((p) => p.id === projectId));
	const activeExternals = $derived(externals.filter((e) => e.isActive));
	const activeProjects = $derived(projects.filter((p) => p.isActive));

	// Calculate total minutes from hours and minutes inputs
	const totalMinutes = $derived(hours * 60 + minutesInput);

	function dateToDateValue(date: Date): DateValue {
		return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
	}

	function dateValueToString(dateValue: DateValue): string {
		const year = dateValue.year;
		const month = String(dateValue.month).padStart(2, '0');
		const day = String(dateValue.day).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function resetForm() {
		externalId = undefined;
		projectId = undefined;
		dateValue = undefined;
		hours = 0;
		minutesInput = 0;
		error = null;
	}

	function populateForm() {
		if (entry) {
			externalId = entry.externalId;
			projectId = entry.projectId;
			dateValue = dateToDateValue(new Date(entry.date));
			hours = Math.floor(entry.minutes / 60);
			minutesInput = entry.minutes % 60;
		} else {
			resetForm();
			// Set defaults for new entry
			dateValue = dateToDateValue(new Date());
			hours = 1;
			minutesInput = 0;

			if (activeExternals.length > 0) {
				externalId = activeExternals[0].id;
			}

			if (activeProjects.length > 0) {
				projectId = activeProjects[0].id;
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

		if (!externalId) {
			error = 'Debes seleccionar un externo';
			return;
		}

		if (!projectId) {
			error = 'Debes seleccionar un proyecto';
			return;
		}

		if (!dateValue) {
			error = 'La fecha es obligatoria';
			return;
		}

		if (totalMinutes <= 0) {
			error = 'La duración debe ser mayor a 0';
			return;
		}

		const dateStr = dateValueToString(dateValue);

		submitting = true;

		try {
			if (isEditMode && entry) {
				const data: UpdateExternalHoursDto = {
					projectId,
					date: dateStr,
					minutes: totalMinutes
				};
				await updateExternalHours(entry.externalId, entry.id, data);
			} else {
				const data: CreateExternalHoursDto = {
					projectId,
					date: dateStr,
					minutes: totalMinutes
				};
				await createExternalHours(externalId, data);
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
		const h = Math.floor(mins / 60);
		const m = mins % 60;
		if (h > 0) {
			return `${h}h ${m}m`;
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
					<Label>Externo</Label>
					<Select type="single" bind:value={externalId} disabled={submitting || isEditMode}>
						<SelectTrigger class="w-full">
							{#if selectedExternal}
								{selectedExternal.name}
							{:else}
								<span class="text-muted-foreground">Seleccionar externo</span>
							{/if}
						</SelectTrigger>
						<SelectContent>
							{#each activeExternals as ext (ext.id)}
								<SelectItem value={ext.id} label={ext.name} />
							{/each}
						</SelectContent>
					</Select>
				</div>

				<div class="grid gap-2">
					<Label>Proyecto</Label>
					<Select type="single" bind:value={projectId} disabled={submitting}>
						<SelectTrigger class="w-full min-w-0">
							<div class="flex min-w-0 items-center">
								{#if selectedProject}
									<ProjectLabel project={selectedProject} truncate />
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
			</div>

			<div class="grid gap-2">
				<Label>Fecha</Label>
				<Popover.Root>
					<Popover.Trigger class="w-full justify-start">
						{#snippet child({ props })}
							<Button
								variant="outline"
								class={cn(
									'w-full justify-start text-start font-normal',
									!dateValue && 'text-muted-foreground'
								)}
								disabled={submitting}
								{...props}
							>
								<span class="material-symbols-rounded text-lg!">calendar_today</span>
								{dateValue ? df.format(dateValue.toDate(getLocalTimeZone())) : 'Seleccionar fecha'}
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-auto p-0">
						<Calendar bind:value={dateValue} type="single" initialFocus />
					</Popover.Content>
				</Popover.Root>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label for="hours">Horas</Label>
					<Input
						id="hours"
						type="number"
						min="0"
						max="24"
						bind:value={hours}
						disabled={submitting}
					/>
				</div>
				<div class="grid gap-2">
					<Label for="minutesInput">Minutos</Label>
					<Input
						id="minutesInput"
						type="number"
						min="0"
						max="59"
						bind:value={minutesInput}
						disabled={submitting}
					/>
				</div>
			</div>

			<div class="text-sm text-muted-foreground text-right">
				Duración total: <span class="font-medium text-foreground"
					>{formatDuration(totalMinutes)}</span
				>
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

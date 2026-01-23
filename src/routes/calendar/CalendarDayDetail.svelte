<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import type { CalendarDay, EntryType, TimeEntryBrief } from '$lib/api/calendar';
	import { DAY_STATUS_STYLES, DAY_STATUS_LABELS, ABSENCE_TYPE_LABELS } from '$lib/types/calendar';
	import ProjectLabel from '$lib/components/ProjectLabel.svelte';

	type Props = {
		open: boolean;
		day: CalendarDay | null;
		onClose: () => void;
		onAddEntry?: () => void;
		onAddAbsence?: () => void;
		onEditEntry?: (entry: TimeEntryBrief) => void;
		onDeleteEntry?: (entry: TimeEntryBrief) => void;
	};

	let {
		open = $bindable(),
		day,
		onClose,
		onAddEntry,
		onAddAbsence,
		onEditEntry,
		onDeleteEntry
	}: Props = $props();

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('es-ES', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	function formatTime(dateString: string): string {
		return new Date(dateString).toLocaleTimeString('es-ES', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatMinutes(minutes: number): string {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 0) {
			return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
		}
		return `${mins}m`;
	}

	function handleClose() {
		open = false;
		onClose();
	}

	function isPauseEntry(entryType: EntryType): boolean {
		return entryType.startsWith('PAUSE');
	}

	const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
		WORK: 'Trabajo',
		PAUSE_COFFEE: 'Pausa café',
		PAUSE_LUNCH: 'Pausa comida',
		PAUSE_PERSONAL: 'Pausa personal'
	};

	const styles = $derived(day ? DAY_STATUS_STYLES[day.status] : null);
	const statusLabel = $derived(day ? DAY_STATUS_LABELS[day.status] : '');

	// Calculate coffee pause minutes from entries
	const coffeePauseMinutes = $derived(() => {
		if (!day?.entries) return 0;
		return day.entries
			.filter((e) => e.entryType === 'PAUSE_COFFEE')
			.reduce((sum, e) => sum + e.durationMinutes, 0);
	});

	// Check if the day is in the future (no entries allowed)
	const isFutureDay = $derived(() => {
		if (!day) return false;
		const dayDate = new Date(day.date);
		dayDate.setHours(0, 0, 0, 0);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return dayDate > today;
	});
</script>

<Dialog bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<DialogContent class="sm:max-w-lg">
		{#if day}
			<DialogHeader>
				<DialogTitle class="capitalize">{formatDate(day.date)}</DialogTitle>
				<DialogDescription class="flex items-center gap-2">
					<Badge class="{styles?.bgClass} {styles?.textClass}">
						{statusLabel}
					</Badge>
					{#if day.overtimeMinutes && day.overtimeMinutes > 0}
						<Badge variant="outline" class="text-yellow-600">
							<span class="material-symbols-rounded text-sm! mr-1">more_time</span>
							+{formatMinutes(day.overtimeMinutes)} extra
						</Badge>
					{/if}
				</DialogDescription>
			</DialogHeader>

			<div class="space-y-4 py-2">
				<!-- Holiday/Absence Info -->
				{#if day.holidayName}
					<div class="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg">
						<span class="material-symbols-rounded text-blue-500">event</span>
						<span class="text-blue-600 dark:text-blue-400 font-medium">{day.holidayName}</span>
					</div>
				{/if}

				{#if day.absenceType}
					<div class="flex items-center gap-2 p-3 bg-purple-500/10 rounded-lg">
						<span class="material-symbols-rounded text-purple-500">beach_access</span>
						<span class="text-purple-600 dark:text-purple-400 font-medium">
							{ABSENCE_TYPE_LABELS[day.absenceType] || day.absenceType}
						</span>
					</div>
				{/if}

				<!-- Hours Summary -->
				<div class="grid grid-cols-2 gap-4">
					<div class="p-3 bg-muted rounded-lg">
						<p class="text-sm text-muted-foreground">Horas esperadas</p>
						<p class="text-lg font-semibold">
							{day.expectedMinutes > 0 ? formatMinutes(day.expectedMinutes) : '-'}
						</p>
					</div>
					<div class="p-3 bg-muted rounded-lg">
						<p class="text-sm text-muted-foreground">Horas registradas</p>
						<p class="text-lg font-semibold">
							<span class:text-success={day.loggedMinutes > 0}>
								{day.loggedMinutes > 0 ? formatMinutes(day.loggedMinutes) : '-'}
							</span>
							{#if coffeePauseMinutes() > 0}
								<span class="text-sm font-normal text-muted-foreground">
									({formatMinutes(coffeePauseMinutes())} café)
								</span>
							{/if}
						</p>
					</div>
				</div>

				<!-- Time Entries -->
				{#if day.entries.length > 0}
					<div>
						<h4 class="text-sm font-medium mb-2">Registros del día</h4>
						<div class="space-y-2">
							{#each day.entries as entry (entry.id)}
								{@const isPause = isPauseEntry(entry.entryType)}
								{@const isCoffeePause = entry.entryType === 'PAUSE_COFFEE'}
								{@const isRegularPause = isPause && !isCoffeePause}
								<div
									class="flex items-center justify-between p-3 border rounded-lg transition-opacity {isRegularPause
										? 'opacity-60 hover:opacity-80 bg-muted/30'
										: ''}"
								>
									<div class="flex items-center gap-3">
										<div class="text-sm">
											<span class="font-medium">{formatTime(entry.startTime)}</span>
											<span class="text-muted-foreground"> - </span>
											<span class="font-medium">{formatTime(entry.endTime)}</span>
										</div>
										{#if isPause}
											<Badge variant="outline" class="text-sm text-muted-foreground">
												{ENTRY_TYPE_LABELS[entry.entryType]}
											</Badge>
										{:else if entry.project}
											<Badge variant="secondary" class="text-sm">
												<ProjectLabel project={entry.project} />
											</Badge>
										{/if}
									</div>
									<div class="flex items-center gap-1">
										<span class="text-sm font-medium mr-1 {isPause ? 'text-muted-foreground' : ''}"
											>{formatMinutes(entry.durationMinutes)}</span
										>
										{#if onEditEntry && !isFutureDay()}
											<Button
												variant="ghost"
												size="sm"
												class="h-7 w-7 p-0"
												onclick={() => onEditEntry(entry)}
											>
												<span class="material-symbols-rounded text-base!">edit</span>
											</Button>
										{/if}
										{#if onDeleteEntry && !isFutureDay()}
											<Button
												variant="ghost"
												size="sm"
												class="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
												onclick={() => onDeleteEntry(entry)}
											>
												<span class="material-symbols-rounded text-base!">delete</span>
											</Button>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{:else if day.status === 'MISSING_LOGS' || day.status === 'PARTIALLY_WORKED'}
					<div class="flex flex-col items-center justify-center py-6 text-muted-foreground">
						<span class="material-symbols-rounded text-4xl! mb-2">history</span>
						<p class="text-sm">No hay registros para este día</p>
					</div>
				{/if}

				<!-- Action buttons -->
				{#if onAddEntry || onAddAbsence}
					<div class="flex flex-wrap gap-2 pt-4 border-t">
						{#if onAddEntry && !isFutureDay()}
							<Button variant="outline" size="sm" onclick={onAddEntry}>
								<span class="material-symbols-rounded text-lg! mr-2">add</span>
								Añadir registro
							</Button>
						{/if}
						{#if onAddAbsence && !day.absenceType && !day.holidayName}
							<Button variant="outline" size="sm" onclick={onAddAbsence}>
								<span class="material-symbols-rounded text-lg! mr-2">beach_access</span>
								Solicitar ausencia
							</Button>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</DialogContent>
</Dialog>

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
	import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';
	import type { CalendarDay, EntryType } from '$lib/api/calendar';
	import { DAY_STATUS_STYLES, DAY_STATUS_LABELS, ABSENCE_TYPE_LABELS } from '$lib/types/calendar';

	type Props = {
		open: boolean;
		day: CalendarDay | null;
		onClose: () => void;
		onAddEntry?: () => void;
	};

	let { open = $bindable(), day, onClose, onAddEntry }: Props = $props();

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
					{#if day.isOvertime}
						<Badge variant="outline" class="text-yellow-600">
							<span class="material-symbols-rounded text-sm! mr-1">schedule</span>
							Horas extra
						</Badge>
					{/if}
				</DialogDescription>
			</DialogHeader>

			<div class="space-y-4 py-4">
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
						<p class="text-lg font-semibold {day.loggedMinutes > 0 ? 'text-success' : ''}">
							{day.loggedMinutes > 0 ? formatMinutes(day.loggedMinutes) : '-'}
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
								<div
									class="flex items-center justify-between p-3 border rounded-lg transition-opacity {isPause
										? 'opacity-60 bg-muted/30'
										: ''}"
								>
									<div class="flex items-center gap-3">
										{#if isPause}
											<Tooltip>
												<TooltipTrigger>
													<span class="material-symbols-rounded text-base text-muted-foreground"
														>pause_circle</span
													>
												</TooltipTrigger>
												<TooltipContent>
													<p>
														{ENTRY_TYPE_LABELS[entry.entryType]} - No cuenta como tiempo trabajado
													</p>
												</TooltipContent>
											</Tooltip>
										{/if}
										<div class="text-sm">
											<span class="font-medium">{formatTime(entry.startTime)}</span>
											<span class="text-muted-foreground"> - </span>
											<span class="font-medium">{formatTime(entry.endTime)}</span>
										</div>
										{#if isPause}
											<Badge variant="outline" class="text-xs text-muted-foreground">
												{ENTRY_TYPE_LABELS[entry.entryType]}
											</Badge>
										{:else if entry.projectName}
											<Badge variant="secondary">{entry.projectName}</Badge>
										{/if}
									</div>
									<span class="text-sm font-medium {isPause ? 'text-muted-foreground' : ''}"
										>{formatMinutes(entry.durationMinutes)}</span
									>
								</div>
							{/each}
						</div>
					</div>
				{:else if day.status === 'MISSING_LOGS' || day.status === 'PARTIALLY_WORKED'}
					<div class="flex flex-col items-center justify-center py-6 text-muted-foreground">
						<span class="material-symbols-rounded text-4xl! mb-2">history</span>
						<p class="text-sm">No hay registros para este día</p>
						{#if onAddEntry}
							<Button variant="outline" class="mt-4" onclick={onAddEntry}>
								<span class="material-symbols-rounded text-lg! mr-2">add</span>
								Añadir registro
							</Button>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</DialogContent>
</Dialog>

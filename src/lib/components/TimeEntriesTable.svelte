<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';
	import type { TimeEntry, TimeEntryType } from '$lib/api/time-entries';
	import ProjectLabel from './ProjectLabel.svelte';

	type Props = {
		timeEntries: TimeEntry[];
		timeEntryTypes: TimeEntryType[];
		loading?: boolean;
		error?: string | null;
		hasProjects?: boolean;
		hasComments?: boolean;
		showSourceColumn?: boolean;
		showStatusColumn?: boolean;
		showActions?: boolean;
		emptyMessage?: string;
		emptyButtonLabel?: string;
		onEdit?: (entry: TimeEntry) => void;
		onDelete?: (entry: TimeEntry) => void;
		onCreate?: () => void;
		onViewAuditLog?: (entry: TimeEntry) => void;
	};

	let {
		timeEntries,
		timeEntryTypes,
		loading = false,
		error = null,
		hasProjects = false,
		hasComments = false,
		showSourceColumn = false,
		showStatusColumn = false,
		showActions = true,
		emptyMessage = 'No hay registros de tiempo',
		emptyButtonLabel = 'Crear primer registro',
		onEdit,
		onDelete,
		onCreate,
		onViewAuditLog
	}: Props = $props();

	const timeEntryTypeLookup = $derived(
		timeEntryTypes.reduce<Record<string, TimeEntryType>>((acc, type) => {
			acc[type.value] = type;
			return acc;
		}, {})
	);

	type GroupedEntries = {
		dateKey: string;
		dayNumber: number;
		dayOfWeek: string;
		entries: TimeEntry[];
		totalMinutes: number;
		workMinutes: number;
		pauseMinutes: number;
		coffeeMinutes: number;
	};

	function isPauseEntry(entry: TimeEntry): boolean {
		const entryType = entry.entryType?.toUpperCase() ?? '';
		return entryType.startsWith('PAUSE');
	}

	const groupedByDay = $derived.by(() => {
		const groups: Record<string, GroupedEntries> = {};

		for (const entry of timeEntries) {
			const date = new Date(entry.startTime);
			const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

			if (!groups[dateKey]) {
				groups[dateKey] = {
					dateKey,
					dayNumber: date.getDate(),
					dayOfWeek: date.toLocaleDateString('es-ES', { weekday: 'short' }),
					entries: [],
					totalMinutes: 0,
					workMinutes: 0,
					pauseMinutes: 0,
					coffeeMinutes: 0
				};
			}

			groups[dateKey].entries.push(entry);
			groups[dateKey].totalMinutes += entry.durationMinutes;

			if (isPauseEntry(entry)) {
				if (entry.entryType === 'PAUSE_COFFEE') {
					groups[dateKey].workMinutes += entry.durationMinutes;
					groups[dateKey].coffeeMinutes += entry.durationMinutes;
				} else {
					groups[dateKey].pauseMinutes += entry.durationMinutes;
				}
			} else {
				groups[dateKey].workMinutes += entry.durationMinutes;
			}
		}

		return Object.values(groups).sort(
			(a, b) => new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime()
		);
	});

	function getEntryTypeName(value?: string, fallback?: string) {
		if (!value) return fallback ?? '-';
		return timeEntryTypeLookup[value]?.name ?? fallback ?? '-';
	}

	function getSourceLabel(source?: string): string {
		const sourceLabels: Record<string, string> = {
			WEB: 'Web',
			APP: 'App',
			WHATSAPP: 'WhatsApp'
		};
		return sourceLabels[source ?? ''] ?? source ?? '-';
	}

	function formatDuration(minutes: number): string {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 0 && mins > 0) {
			return `${hours}h ${mins}m`;
		}
		if (hours > 0) {
			return `${hours}h`;
		}
		return `${mins}m`;
	}

	function formatTime(dateString: string): string {
		return new Date(dateString).toLocaleTimeString('es-ES', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

{#if loading}
	<div class="space-y-6">
		{#each Array.from({ length: 3 }, (_, i) => i) as dayIndex (dayIndex)}
			<div>
				<Skeleton class="h-5 w-24 mb-3" />
				<div class="space-y-0 border border-border rounded-lg overflow-hidden">
					{#each Array.from({ length: 2 }, (_, j) => j) as entryIndex (`${dayIndex}-${entryIndex}`)}
						<div
							class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-3 sm:px-4 py-3 border-b border-border last:border-b-0"
						>
							<Skeleton class="h-4 w-24" />
							<Skeleton class="h-4 w-14" />
							<Skeleton class="h-5 w-16 rounded-full" />
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
{:else if error}
	<div class="flex items-center justify-center py-8 text-destructive">
		<span class="material-symbols-rounded mr-2">error</span>
		{error}
	</div>
{:else if timeEntries.length === 0}
	<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
		<span class="material-symbols-rounded text-4xl! mb-2">history</span>
		<p>{emptyMessage}</p>
		{#if onCreate}
			<Button variant="outline" class="mt-4" onclick={onCreate}>
				<span class="material-symbols-rounded mr-2 text-lg!">add</span>
				{emptyButtonLabel}
			</Button>
		{/if}
	</div>
{:else}
	<div class="time-table space-y-6">
		{#each groupedByDay as day (day.dateKey)}
			<div>
				<!-- Day header -->
				<div class="flex items-center gap-2 sm:gap-3 mb-2">
					<div class="flex items-baseline gap-1 sm:gap-1.5">
						<span class="text-xl sm:text-2xl font-semibold tabular-nums text-foreground">
							{day.dayNumber}
						</span>
						<span class="text-xs sm:text-sm font-medium text-muted-foreground uppercase">
							{day.dayOfWeek}
						</span>
					</div>
					<div class="h-px flex-1 bg-border"></div>
					<div class="flex items-center gap-2">
						{#if day.workMinutes > 0}
							<span
								class="flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary tabular-nums"
							>
								{formatDuration(day.workMinutes)}
								{#if day.coffeeMinutes > 0}
									<span class="text-xs font-normal text-muted-foreground flex items-center">
										(<span class="material-symbols-rounded text-sm! mr-1">coffee</span
										>{formatDuration(day.coffeeMinutes)})
									</span>
								{/if}
							</span>
						{/if}
						{#if day.pauseMinutes > 0}
							<span
								class="hidden sm:flex items-center gap-1 text-xs text-muted-foreground tabular-nums"
							>
								<span class="material-symbols-rounded text-sm!">pause</span>
								{formatDuration(day.pauseMinutes)}
							</span>
						{/if}
					</div>
				</div>

				<!-- Entries table -->
				<div class="border border-border rounded-lg overflow-hidden bg-card">
					{#each day.entries as entry, idx (entry.id)}
						{@const isPause = isPauseEntry(entry)}
						{@const isRegularPause = isPause && entry.entryType !== 'PAUSE_COFFEE'}
						<div
							class="group/entry flex flex-col px-3 sm:px-4 py-2.5 sm:py-2.5 transition-colors hover:bg-muted/50 {idx >
							0
								? 'border-t border-border'
								: ''} {isRegularPause ? 'opacity-60 hover:opacity-80' : ''}"
						>
							<!-- Main entry row -->
							<div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
							<!-- Mobile: Top row with time + duration + actions -->
							<div class="flex items-center gap-2 sm:contents">
								<!-- Time range -->
								<div class="flex items-center gap-1 text-sm tabular-nums shrink-0">
									<span class="font-medium text-foreground">{formatTime(entry.startTime)}</span>
									<span class="text-muted-foreground/60">→</span>
									<span class="font-medium text-foreground">{formatTime(entry.endTime)}</span>
								</div>

								<!-- Duration -->
								<span
									class="text-sm font-semibold tabular-nums px-2 py-0.5 rounded shrink-0 {isRegularPause
										? 'text-muted-foreground bg-muted'
										: 'text-primary bg-primary/8'}"
								>
									{formatDuration(entry.durationMinutes)}
								</span>

								<!-- Entry Type - hidden on mobile, shown on desktop -->
								<span
									class="hidden sm:flex text-sm shrink-0 items-center gap-1 text-muted-foreground"
								>
									{#if isRegularPause}
										<span class="material-symbols-rounded text-sm!">pause</span>
									{/if}
									{getEntryTypeName(
										entry.entryType,
										entry.timeEntryType?.name ?? entry.entryTypeName ?? '-'
									)}
								</span>

								<!-- Project - hidden on mobile -->
								{#if hasProjects && entry.project}
									<div class="hidden md:block">
										<ProjectLabel project={entry.project} className="text-sm max-w-80" />
									</div>
								{/if}

								<!-- Location indicator - icon only on mobile -->
								<Badge variant={entry.isInOffice ? 'default' : 'secondary'} class="shrink-0">
									<span class="material-symbols-rounded text-xs!">
										{entry.isInOffice ? 'apartment' : 'home'}
									</span>
									<span class="hidden sm:inline">{entry.isInOffice ? 'Oficina' : 'Remoto'}</span>
								</Badge>

								<!-- Source -->
								{#if showSourceColumn}
									<span class="hidden sm:inline text-xs text-muted-foreground shrink-0">
										{getSourceLabel(entry.source)}
									</span>
								{/if}

								<!-- Status indicators -->
								{#if showStatusColumn}
									<div class="hidden sm:flex items-center gap-2">
										{#if entry.isManual}
											{#if onViewAuditLog}
												<Tooltip>
													<TooltipTrigger
														class="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
														onclick={() => onViewAuditLog(entry)}
													>
														<span class="material-symbols-rounded text-lg!">edit_note</span>
														<span class="sr-only">Ver historial de cambios</span>
													</TooltipTrigger>
													<TooltipContent>
														<p>Registro manual — ver historial</p>
													</TooltipContent>
												</Tooltip>
											{:else}
												<Tooltip>
													<TooltipTrigger class="flex items-center">
														<span class="material-symbols-rounded text-lg! text-muted-foreground"
															>edit_note</span
														>
													</TooltipTrigger>
													<TooltipContent>
														<p>Registro creado manualmente</p>
													</TooltipContent>
												</Tooltip>
											{/if}
										{/if}
										{#if entry.isModified}
											{#if onViewAuditLog}
												<Tooltip>
													<TooltipTrigger
														class="flex items-center justify-center h-7 w-7 rounded-md text-warning hover:text-warning/80 hover:bg-muted transition-colors cursor-pointer"
														onclick={() => onViewAuditLog(entry)}
													>
														<span class="material-symbols-rounded text-lg!">history</span>
														<span class="sr-only">Ver historial de cambios</span>
													</TooltipTrigger>
													<TooltipContent>
														<p>Registro modificado — ver historial</p>
													</TooltipContent>
												</Tooltip>
											{:else}
												<Tooltip>
													<TooltipTrigger class="flex items-center">
														<span class="material-symbols-rounded text-lg! text-warning"
															>history</span
														>
													</TooltipTrigger>
													<TooltipContent>
														<p>Registro modificado después de su creación</p>
													</TooltipContent>
												</Tooltip>
											{/if}
										{/if}
									</div>
								{/if}

								<div class="flex-1"></div>

								<!-- Actions - always visible on mobile, hover on desktop -->
								{#if showActions}
									<div
										class="flex items-center gap-1 sm:opacity-0 sm:group-hover/entry:opacity-100 transition-opacity"
									>
										{#if onEdit}
											<Button
												variant="ghost"
												size="sm"
												class="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
												onclick={() => onEdit(entry)}
											>
												<span class="material-symbols-rounded text-lg!">edit</span>
												<span class="sr-only">Editar</span>
											</Button>
										{/if}
										{#if onDelete}
											<Button
												variant="ghost"
												size="sm"
												class="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
												onclick={() => onDelete(entry)}
											>
												<span class="material-symbols-rounded text-lg!">delete</span>
												<span class="sr-only">Eliminar</span>
											</Button>
										{/if}
									</div>
								{/if}
							</div>

							<!-- Mobile: Second row with entry type + project + comment (if any) -->
							<div
								class="flex sm:hidden items-center gap-2 text-xs text-muted-foreground flex-wrap"
							>
								<span class="flex items-center gap-1">
									{#if isRegularPause}
										<span class="material-symbols-rounded text-xs!">pause</span>
									{/if}
									{getEntryTypeName(
										entry.entryType,
										entry.timeEntryType?.name ?? entry.entryTypeName ?? '-'
									)}
								</span>
								{#if hasProjects && entry.project}
									<span class="text-muted-foreground/40">•</span>
									<ProjectLabel project={entry.project} className="text-xs max-w-[160px]" />
								{/if}
							</div>
							</div>

							<!-- Comment row -->
							{#if hasComments && entry.comment}
								<div
									class="flex items-center gap-1.5 mt-2 pt-2 border-t border-secondary text-sm text-muted-foreground"
								>
									<span class="material-symbols-rounded text-sm!">comment</span>
									<span>{entry.comment}</span>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
{/if}

<style>
	.time-table {
		--row-border: color-mix(in srgb, var(--color-border) 50%, transparent);
	}
</style>

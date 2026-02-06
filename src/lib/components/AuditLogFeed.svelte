<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import {
		FIELD_LABELS,
		ACTION_LABELS,
		ACTION_ICONS,
		ACTION_VARIANTS,
		type AuditLogWithEntry,
		type AuditLogChanges,
		type AuditAction
	} from '$lib/api/audit-logs';

	type Props = {
		auditLogs: AuditLogWithEntry[];
		loading?: boolean;
		error?: string | null;
		onViewEntry?: (log: AuditLogWithEntry) => void;
	};

	let { auditLogs, loading = false, error = null, onViewEntry }: Props = $props();

	// Group audit logs by day
	type GroupedLogs = {
		dateKey: string;
		dayNumber: number;
		dayOfWeek: string;
		logs: AuditLogWithEntry[];
	};

	const groupedByDay = $derived.by(() => {
		const groups: Record<string, GroupedLogs> = {};

		for (const log of auditLogs) {
			const date = new Date(log.timestamp);
			const dateKey = date.toISOString().split('T')[0];

			if (!groups[dateKey]) {
				groups[dateKey] = {
					dateKey,
					dayNumber: date.getDate(),
					dayOfWeek: date.toLocaleDateString('es-ES', { weekday: 'short' }),
					logs: []
				};
			}

			groups[dateKey].logs.push(log);
		}

		return Object.values(groups).sort(
			(a, b) => new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime()
		);
	});

	function formatTime(dateString: string): string {
		return new Date(dateString).toLocaleTimeString('es-ES', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatDuration(minutes: number): string {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
		if (hours > 0) return `${hours}h`;
		return `${mins}m`;
	}

	function formatFieldValue(field: string, value: unknown): string {
		if (value === null || value === undefined) return '-';

		if (field === 'startTime' || field === 'endTime') {
			return formatTime(String(value));
		}
		if (field === 'durationMinutes') {
			return formatDuration(Number(value));
		}
		if (field === 'isInOffice') {
			return value ? 'Oficina' : 'Remoto';
		}
		if (field === 'entryType') {
			const labels: Record<string, string> = {
				WORK: 'Trabajo',
				PAUSE_COFFEE: 'Pausa café',
				PAUSE_LUNCH: 'Pausa comida',
				PAUSE_PERSONAL: 'Pausa personal'
			};
			return labels[String(value)] ?? String(value);
		}
		if (field === 'source') {
			const labels: Record<string, string> = {
				WEB: 'Web',
				APP: 'App',
				WHATSAPP: 'WhatsApp'
			};
			return labels[String(value)] ?? String(value);
		}
		if (field === 'isManual') {
			return value ? 'Sí' : 'No';
		}

		return String(value);
	}

	function getChangedFields(changes: AuditLogChanges): string[] {
		return Object.keys(changes).filter((key) => key in FIELD_LABELS || key === 'projectId');
	}

	function getFieldLabel(field: string): string {
		return FIELD_LABELS[field] ?? field;
	}

	function getEntryDescription(log: AuditLogWithEntry): string {
		if (log.timeEntry) {
			return `${formatTime(log.timeEntry.startTime)} - ${formatTime(log.timeEntry.endTime)}`;
		}
		return 'Registro eliminado';
	}
</script>

{#if loading}
	<div class="space-y-6">
		{#each Array.from({ length: 3 }, (_, i) => i) as dayIndex (dayIndex)}
			<div>
				<Skeleton class="h-5 w-24 mb-3" />
				<div class="space-y-3">
					{#each Array.from({ length: 2 }, (_, j) => j) as entryIndex (`${dayIndex}-${entryIndex}`)}
						<Skeleton class="h-20 w-full rounded-lg" />
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
{:else if auditLogs.length === 0}
	<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
		<span class="material-symbols-rounded text-4xl! mb-2">verified</span>
		<p>No hay cambios registrados en este periodo</p>
	</div>
{:else}
	<div class="space-y-6">
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
					<span class="text-xs text-muted-foreground">
						{day.logs.length}
						{day.logs.length === 1 ? 'cambio' : 'cambios'}
					</span>
				</div>

				<!-- Audit log items -->
				<div class="border border-border rounded-lg overflow-hidden bg-card">
					{#each day.logs as log, idx (log.id)}
						{@const action = log.action as AuditAction}
						{@const changedFields = getChangedFields(log.changes)}

						<div
							class="group/item px-3 sm:px-4 py-3 transition-colors hover:bg-muted/50 {idx > 0
								? 'border-t border-border'
								: ''}"
						>
							<!-- Top row: Action + Time entry ref + timestamp -->
							<div class="flex items-center gap-2 flex-wrap">
								<Badge variant={ACTION_VARIANTS[action]} class="text-xs shrink-0">
									<span class="material-symbols-rounded text-xs! mr-1">
										{ACTION_ICONS[action]}
									</span>
									{ACTION_LABELS[action]}
								</Badge>

								<!-- Time entry reference -->
								{#if log.timeEntry}
									<span class="text-sm text-foreground font-medium tabular-nums">
										{getEntryDescription(log)}
									</span>
								{:else}
									<span class="text-sm text-muted-foreground italic"> Registro eliminado </span>
								{/if}

								<div class="flex-1"></div>

								<!-- Timestamp -->
								<span class="text-xs text-muted-foreground tabular-nums shrink-0">
									{formatTime(log.timestamp)}
								</span>

								<!-- View details button -->
								{#if onViewEntry && log.timeEntry}
									<Button
										variant="ghost"
										size="sm"
										class="h-7 w-7 p-0 text-muted-foreground hover:text-foreground sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity"
										onclick={() => onViewEntry(log)}
									>
										<span class="material-symbols-rounded text-lg!">open_in_new</span>
										<span class="sr-only">Ver historial completo</span>
									</Button>
								{/if}
							</div>

							<!-- Actor -->
							<p class="text-xs text-muted-foreground mt-1">
								por <span class="font-medium">{log.actor.name}</span>
							</p>

							<!-- Reason -->
							{#if log.reason}
								<p class="text-xs text-muted-foreground mt-1 italic">
									"{log.reason}"
								</p>
							{/if}

							<!-- Changes summary (compact) -->
							{#if changedFields.length > 0 && action === 'UPDATE'}
								<div class="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
									{#each changedFields as field (field)}
										{@const change = log.changes[field]}
										<div class="flex items-center gap-1">
											<span class="text-muted-foreground">{getFieldLabel(field)}:</span>
											<span class="text-muted-foreground line-through">
												{formatFieldValue(field, change.old)}
											</span>
											<span class="material-symbols-rounded text-xs! text-muted-foreground/60">
												arrow_forward
											</span>
											<span class="text-foreground font-medium">
												{formatFieldValue(field, change.new)}
											</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
{/if}

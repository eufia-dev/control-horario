<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import type { TimeEntry } from '$lib/api/time-entries';
	import {
		fetchTimeEntryAuditLogs,
		FIELD_LABELS,
		ACTION_LABELS,
		ACTION_ICONS,
		ACTION_VARIANTS,
		type AuditLog,
		type AuditLogChanges,
		type AuditAction
	} from '$lib/api/audit-logs';

	type Props = {
		open: boolean;
		entry: TimeEntry | null;
		onClose: () => void;
	};

	let { open = $bindable(), entry, onClose }: Props = $props();

	let auditLogs = $state<AuditLog[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		if (open && entry) {
			loadAuditLogs(entry.id);
		}
	});

	async function loadAuditLogs(timeEntryId: string) {
		loading = true;
		error = null;
		auditLogs = [];
		try {
			auditLogs = await fetchTimeEntryAuditLogs(timeEntryId);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar el historial de cambios';
		} finally {
			loading = false;
		}
	}

	function handleClose() {
		open = false;
		onClose();
	}

	function formatDateTime(dateString: string): string {
		return new Date(dateString).toLocaleDateString('es-ES', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatTime(dateString: string): string {
		return new Date(dateString).toLocaleTimeString('es-ES', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('es-ES', {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
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
</script>

<Dialog bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<DialogContent class="sm:max-w-xl max-h-[85vh] overflow-y-auto">
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2 text-lg">Historial de cambios</DialogTitle>
			{#if entry}
				<DialogDescription class="flex items-center gap-2 text-sm">
					<span class="capitalize">{formatDate(entry.startTime)}</span>
					<span class="text-muted-foreground/50">&middot;</span>
					<span class="tabular-nums"
						>{formatTime(entry.startTime)} - {formatTime(entry.endTime)}</span
					>
				</DialogDescription>
			{/if}
		</DialogHeader>

		<div class="py-2">
			{#if loading}
				<div class="space-y-5">
					{#each Array.from({ length: 3 }, (_, i) => i) as i (i)}
						<div class="space-y-2">
							<div class="flex items-center gap-2">
								<Skeleton class="h-5 w-20 rounded-full" />
								<Skeleton class="h-4 w-32" />
							</div>
							<Skeleton class="h-20 w-full rounded-lg" />
						</div>
					{/each}
				</div>
			{:else if error}
				<div class="flex flex-col items-center justify-center py-16 text-destructive">
					<span class="material-symbols-rounded text-5xl! mb-3">error</span>
					<p>{error}</p>
				</div>
			{:else if auditLogs.length === 0}
				<div class="flex flex-col items-center justify-center py-16 text-muted-foreground">
					<span class="material-symbols-rounded text-5xl! mb-3">verified</span>
					<p>No hay cambios registrados</p>
				</div>
			{:else}
				<div class="space-y-0">
					{#each auditLogs as log, idx (log.id)}
						{@const action = log.action as AuditAction}
						{@const changedFields = getChangedFields(log.changes)}
						{@const isLast = idx === auditLogs.length - 1}

						<div class="relative flex gap-4 {isLast ? '' : 'pb-8'}">
							<!-- Timeline line -->
							<div class="absolute left-[15px] top-0 bottom-0 w-px bg-border"></div>

							<!-- Timeline dot -->
							<div class="relative z-10 mt-0.5 flex shrink-0 items-center justify-center">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-full {action === 'DELETE'
										? 'bg-destructive/15 text-destructive'
										: action === 'CREATE'
											? 'bg-primary/15 text-primary'
											: 'bg-muted text-muted-foreground'}"
								>
									<span class="material-symbols-rounded text-lg!">
										{ACTION_ICONS[action]}
									</span>
								</div>
							</div>

							<!-- Content -->
							<div class="flex-1 min-w-0 pt-0.5">
								<!-- Header row -->
								<div class="flex flex-wrap items-center gap-2">
									<Badge variant={ACTION_VARIANTS[action]}>
										{ACTION_LABELS[action]}
									</Badge>
									<span class="text-sm text-muted-foreground">
										por <span class="font-medium text-foreground">{log.actor.name}</span>
									</span>
								</div>
								<p class="text-sm text-muted-foreground mt-1">
									{formatDateTime(log.timestamp)}
								</p>

								<!-- Reason -->
								{#if log.reason}
									<p class="text-sm text-muted-foreground mt-2 italic">
										"{log.reason}"
									</p>
								{/if}

								<!-- Changes diff table -->
								{#if changedFields.length > 0}
									<div class="mt-3 rounded-lg border border-border overflow-hidden">
										{#each changedFields as field, fieldIdx (field)}
											{@const change = log.changes[field]}
											<div
												class="flex items-center gap-3 px-4 py-2.5 {fieldIdx > 0
													? 'border-t border-border'
													: ''}"
											>
												<span
													class="text-sm font-medium text-muted-foreground shrink-0 min-w-[100px]"
												>
													{getFieldLabel(field)}
												</span>
												<div class="flex-1 min-w-0 text-sm">
													{#if action === 'CREATE'}
														<span class="text-foreground">
															{formatFieldValue(field, change.new)}
														</span>
													{:else if action === 'DELETE'}
														<span class="text-muted-foreground line-through">
															{formatFieldValue(field, change.old)}
														</span>
													{:else}
														<div class="flex items-center gap-2 flex-wrap">
															<span class="text-muted-foreground line-through">
																{formatFieldValue(field, change.old)}
															</span>
															<span
																class="material-symbols-rounded text-sm! text-muted-foreground/50"
															>
																arrow_forward
															</span>
															<span class="text-foreground font-medium">
																{formatFieldValue(field, change.new)}
															</span>
														</div>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</DialogContent>
</Dialog>

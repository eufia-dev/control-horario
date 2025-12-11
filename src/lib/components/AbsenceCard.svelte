<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import type { AbsenceResponse } from '$lib/api/absences';
	import {
		ABSENCE_TYPE_LABELS,
		ABSENCE_STATUS_LABELS,
		ABSENCE_STATUS_STYLES
	} from '$lib/types/calendar';

	type Props = {
		absence: AbsenceResponse;
		onCancel?: (absence: AbsenceResponse) => void;
		showUser?: boolean;
	};

	let { absence, onCancel, showUser = false }: Props = $props();

	const statusStyle = $derived(ABSENCE_STATUS_STYLES[absence.status]);
	const typeLabel = $derived(ABSENCE_TYPE_LABELS[absence.type] || absence.type);
	const statusLabel = $derived(ABSENCE_STATUS_LABELS[absence.status] || absence.status);

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('es-ES', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function formatDateRange(start: string, end: string): string {
		const startDate = new Date(start);
		const endDate = new Date(end);

		if (startDate.toDateString() === endDate.toDateString()) {
			return formatDate(start);
		}

		return `${formatDate(start)} - ${formatDate(end)}`;
	}

	function calculateDays(start: string, end: string): number {
		const startDate = new Date(start);
		const endDate = new Date(end);
		const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
	}

	const days = $derived(calculateDays(absence.startDate, absence.endDate));
	const canCancel = $derived(absence.status === 'PENDING' && onCancel);
</script>

<div class="border rounded-lg p-4 space-y-3">
	<div class="flex items-start justify-between gap-2">
		<div class="flex items-center gap-2">
			<Badge variant={statusStyle?.variant || 'secondary'}>
				<span class="material-symbols-rounded text-sm! mr-1">{statusStyle?.icon || 'schedule'}</span
				>
				{statusLabel}
			</Badge>
			{#if showUser && absence.user}
				<span class="text-sm font-medium">{absence.user.name}</span>
			{/if}
		</div>
		{#if canCancel}
			<Button
				variant="ghost"
				size="sm"
				class="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
				onclick={() => onCancel?.(absence)}
			>
				<span class="material-symbols-rounded text-lg!">close</span>
				<span class="sr-only">Cancelar</span>
			</Button>
		{/if}
	</div>

	<div>
		<p class="font-medium">{typeLabel}</p>
		<p class="text-sm text-muted-foreground">
			{formatDateRange(absence.startDate, absence.endDate)}
			<span class="mx-1">·</span>
			{days}
			{days === 1 ? 'día' : 'días'}
		</p>
	</div>

	{#if absence.notes}
		<p class="text-sm text-muted-foreground italic">"{absence.notes}"</p>
	{/if}

	{#if absence.status !== 'PENDING' && absence.reviewedBy}
		<p class="text-xs text-muted-foreground">
			{absence.status === 'APPROVED' ? 'Aprobado' : 'Rechazado'} por {absence.reviewedBy.name}
			{#if absence.reviewedAt}
				· {formatDate(absence.reviewedAt)}
			{/if}
		</p>
	{/if}
</div>

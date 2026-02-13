<script lang="ts">
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import TimeEntriesTable from './TimeEntriesTable.svelte';
	import type { TimeEntry, TimeEntryType } from '$lib/api/time-entries';
	import { formatMonthYear } from '$lib/utils';

	type Props = {
		title?: string;
		timeEntries: TimeEntry[];
		timeEntryTypes: TimeEntryType[];
		loading?: boolean;
		error?: string | null;
		selectedMonth: Date;
		hasProjects?: boolean;
		hasComments?: boolean;
		showSourceColumn?: boolean;
		showStatusColumn?: boolean;
		showActions?: boolean;
		showAddButton?: boolean;
		emptyMessage?: string;
		emptyButtonLabel?: string;
		class?: string;
		onPreviousMonth: () => void;
		onNextMonth: () => void;
		onEdit?: (entry: TimeEntry) => void;
		onDelete?: (entry: TimeEntry) => void;
		onCreate?: () => void;
		onViewAuditLog?: (entry: TimeEntry) => void;
		onExport?: () => void;
	};

	let {
		title = 'Historial',
		timeEntries,
		timeEntryTypes,
		loading = false,
		error = null,
		selectedMonth,
		hasProjects = false,
		hasComments = false,
		showSourceColumn = false,
		showStatusColumn = false,
		showActions = true,
		showAddButton = true,
		emptyMessage = 'No hay registros de tiempo',
		emptyButtonLabel = 'Crear primer registro',
		class: className = '',
		onPreviousMonth,
		onNextMonth,
		onEdit,
		onDelete,
		onCreate,
		onViewAuditLog,
		onExport
	}: Props = $props();

	const isCurrentMonth = $derived(() => {
		const now = new Date();
		return (
			selectedMonth.getFullYear() === now.getFullYear() &&
			selectedMonth.getMonth() === now.getMonth()
		);
	});
</script>

<Card class="w-full {className}">
	<CardHeader class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0">
		<CardTitle class="text-xl font-semibold tracking-tight flex items-center gap-2">
			<span class="material-symbols-rounded text-2xl!">schedule</span>
			{title}
		</CardTitle>
		<div class="flex items-center gap-2 flex-wrap">
			<!-- Month Navigation -->
			<div class="flex items-center gap-1 bg-muted rounded-lg p-1">
				<Button
					variant="ghost"
					size="sm"
					class="h-8 w-8 p-0"
					onclick={onPreviousMonth}
					disabled={loading}
				>
					<span class="material-symbols-rounded text-lg!">chevron_left</span>
					<span class="sr-only">Mes anterior</span>
				</Button>
				<span class="px-2 text-sm font-medium min-w-22 text-center">
					{formatMonthYear(selectedMonth)}
				</span>
				<Button
					variant="ghost"
					size="sm"
					class="h-8 w-8 p-0"
					onclick={onNextMonth}
					disabled={loading || isCurrentMonth()}
				>
					<span class="material-symbols-rounded text-lg!">chevron_right</span>
					<span class="sr-only">Mes siguiente</span>
				</Button>
			</div>
			<!-- Export Button -->
			{#if onExport}
				<Button variant="outline" onclick={onExport} disabled={loading}>
					<span class="material-symbols-rounded text-lg!">download</span>
					Exportar
				</Button>
			{/if}
			<!-- Add Button -->
			{#if showAddButton && onCreate}
				<Button onclick={onCreate}>
					<span class="material-symbols-rounded text-lg!">add</span>
					Añadir
				</Button>
			{/if}
		</div>
	</CardHeader>
	<CardContent>
		<TimeEntriesTable
			{timeEntries}
			{timeEntryTypes}
			{loading}
			{error}
			{hasProjects}
			{hasComments}
			{showSourceColumn}
			{showStatusColumn}
			{showActions}
			{emptyMessage}
			{emptyButtonLabel}
			{onEdit}
			{onDelete}
			{onCreate}
			{onViewAuditLog}
		/>
	</CardContent>
</Card>

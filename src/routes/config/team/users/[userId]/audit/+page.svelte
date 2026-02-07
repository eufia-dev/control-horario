<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import AuditLogFeed from '$lib/components/AuditLogFeed.svelte';
	import AuditLogDialog from '$lib/components/AuditLogDialog.svelte';
	import { fetchUserAuditLogs, type AuditLogWithEntry } from '$lib/api/audit-logs';
	import { type TimeEntry } from '$lib/api/time-entries';
	import { fetchUsers } from '$lib/api/users';
	import { auth } from '$lib/stores/auth';
	import { formatMonthYear } from '$lib/utils';
	import { exportAuditLogsToXlsx } from '$lib/export-xlsx';

	// Get userId from route params
	let userId = $derived($page.params.userId);

	// Audit log data
	let auditLogs = $state<AuditLogWithEntry[]>([]);
	let loadingAuditLogs = $state(false);
	let auditLogsError = $state<string | null>(null);
	let auditMonth = $state(new Date());

	// User name for export filename
	let userName = $state('');

	// Audit log sheet
	let auditSheetOpen = $state(false);
	let auditSheetEntry = $state<TimeEntry | null>(null);

	const isAuditCurrentMonth = $derived(() => {
		const now = new Date();
		return (
			auditMonth.getFullYear() === now.getFullYear() && auditMonth.getMonth() === now.getMonth()
		);
	});

	function goToAuditPreviousMonth() {
		auditMonth = new Date(auditMonth.getFullYear(), auditMonth.getMonth() - 1, 1);
	}

	function goToAuditNextMonth() {
		auditMonth = new Date(auditMonth.getFullYear(), auditMonth.getMonth() + 1, 1);
	}

	async function loadAuditLogs() {
		loadingAuditLogs = true;
		auditLogsError = null;
		try {
			if (!userId) return;
			const year = auditMonth.getFullYear();
			const month = auditMonth.getMonth();
			auditLogs = await fetchUserAuditLogs(userId, year, month);
		} catch (e) {
			auditLogsError = e instanceof Error ? e.message : 'Error al cargar auditoría';
		} finally {
			loadingAuditLogs = false;
		}
	}

	function handleViewEntryFromFeed(log: AuditLogWithEntry) {
		if (log.timeEntry && userId) {
			const entry: TimeEntry = {
				id: log.timeEntry.id,
				userId,
				companyId: '',
				projectId: '',
				entryType: log.timeEntry.entryType,
				startTime: log.timeEntry.startTime,
				endTime: log.timeEntry.endTime,
				durationMinutes: 0,
				isInOffice: false,
				createdAt: ''
			};
			auditSheetEntry = entry;
			auditSheetOpen = true;
		}
	}

	function handleAuditSheetClose() {
		auditSheetEntry = null;
	}

	function handleExportAudit() {
		let companyName = '';
		const unsub = auth.subscribe((s) => {
			companyName = s.user?.companyName ?? '';
		});
		unsub();
		exportAuditLogsToXlsx(auditLogs, auditMonth, userName, companyName);
	}

	// Load audit logs when month changes
	$effect(() => {
		if (userId) {
			loadAuditLogs();
		}
	});

	onMount(async () => {
		try {
			const users = await fetchUsers();
			userName = users.find((u) => u.id === userId)?.name ?? '';
		} catch {
			/* fallback: filename will omit user name */
		}
	});
</script>

<Card>
	<CardHeader class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0">
		<CardTitle class="text-xl font-semibold tracking-tight flex items-center gap-2">
			<span class="material-symbols-rounded text-2xl!">policy</span>
			Auditoría de cambios
		</CardTitle>
		<div class="flex items-center gap-2">
			<div class="flex items-center gap-1 bg-muted rounded-lg p-1">
				<Button
					variant="ghost"
					size="sm"
					class="h-8 w-8 p-0"
					onclick={goToAuditPreviousMonth}
					disabled={loadingAuditLogs}
				>
					<span class="material-symbols-rounded text-lg!">chevron_left</span>
					<span class="sr-only">Mes anterior</span>
				</Button>
				<span class="px-2 text-sm font-medium min-w-22 text-center">
					{formatMonthYear(auditMonth)}
				</span>
				<Button
					variant="ghost"
					size="sm"
					class="h-8 w-8 p-0"
					onclick={goToAuditNextMonth}
					disabled={loadingAuditLogs || isAuditCurrentMonth()}
				>
					<span class="material-symbols-rounded text-lg!">chevron_right</span>
					<span class="sr-only">Mes siguiente</span>
				</Button>
			</div>
			<Button variant="outline" onclick={handleExportAudit} disabled={loadingAuditLogs}>
				<span class="material-symbols-rounded text-lg!">download</span>
				Exportar
			</Button>
		</div>
	</CardHeader>
	<CardContent>
		<AuditLogFeed
			{auditLogs}
			loading={loadingAuditLogs}
			error={auditLogsError}
			onViewEntry={handleViewEntryFromFeed}
		/>
	</CardContent>
</Card>

<AuditLogDialog
	bind:open={auditSheetOpen}
	entry={auditSheetEntry}
	onClose={handleAuditSheetClose}
/>

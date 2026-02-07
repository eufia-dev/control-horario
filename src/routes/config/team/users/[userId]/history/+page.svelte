<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import TimeEntriesCard from '$lib/components/TimeEntriesCard.svelte';
	import AuditLogDialog from '$lib/components/AuditLogDialog.svelte';
	import {
		fetchUserTimeEntries,
		fetchTimeEntryTypes,
		type TimeEntry,
		type TimeEntryType
	} from '$lib/api/time-entries';
	import { fetchUsers } from '$lib/api/users';
	import { auth } from '$lib/stores/auth';
	import { exportTimeEntriesToXlsx } from '$lib/export-xlsx';

	// Get userId from route params
	let userId = $derived($page.params.userId);

	// Time entries data
	let timeEntries = $state<TimeEntry[]>([]);
	let timeEntryTypes = $state<TimeEntryType[]>([]);
	let loadingEntries = $state(true);
	let loadingTypes = $state(true);
	let entriesError = $state<string | null>(null);

	// User name for export filename
	let userName = $state('');

	// Month navigation state
	let selectedMonth = $state(new Date());

	// Audit log sheet
	let auditSheetOpen = $state(false);
	let auditSheetEntry = $state<TimeEntry | null>(null);

	function goToPreviousMonth() {
		selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
		loadEntries();
	}

	function goToNextMonth() {
		selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
		loadEntries();
	}

	async function loadEntries() {
		loadingEntries = true;
		entriesError = null;
		try {
			if (!userId) return;
			const year = selectedMonth.getFullYear();
			const month = selectedMonth.getMonth();
			timeEntries = await fetchUserTimeEntries(userId, year, month);
		} catch (e) {
			entriesError = e instanceof Error ? e.message : 'Error al cargar registros';
		} finally {
			loadingEntries = false;
		}
	}

	async function loadTypes() {
		loadingTypes = true;
		try {
			timeEntryTypes = await fetchTimeEntryTypes();
		} catch (e) {
			console.error('Error loading time entry types:', e);
		} finally {
			loadingTypes = false;
		}
	}

	function handleViewAuditLog(entry: TimeEntry) {
		auditSheetEntry = entry;
		auditSheetOpen = true;
	}

	function handleAuditSheetClose() {
		auditSheetEntry = null;
	}

	function handleExport() {
		let companyName = '';
		const unsub = auth.subscribe((s) => {
			companyName = s.user?.companyName ?? '';
		});
		unsub();
		exportTimeEntriesToXlsx(timeEntries, timeEntryTypes, selectedMonth, userName, companyName);
	}

	onMount(async () => {
		loadEntries();
		loadTypes();
		try {
			const users = await fetchUsers();
			userName = users.find((u) => u.id === userId)?.name ?? '';
		} catch {
			/* fallback: filename will omit user name */
		}
	});
</script>

<TimeEntriesCard
	title="Registros de tiempo"
	{timeEntries}
	{timeEntryTypes}
	loading={loadingEntries || loadingTypes}
	error={entriesError}
	{selectedMonth}
	hasProjects={true}
	showSourceColumn={true}
	showStatusColumn={true}
	showActions={false}
	showAddButton={false}
	onPreviousMonth={goToPreviousMonth}
	onNextMonth={goToNextMonth}
	onViewAuditLog={handleViewAuditLog}
	onExport={handleExport}
/>

<AuditLogDialog
	bind:open={auditSheetOpen}
	entry={auditSheetEntry}
	onClose={handleAuditSheetClose}
/>

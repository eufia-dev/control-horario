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

	// Get userId from route params
	let userId = $derived($page.params.userId);

	// Time entries data
	let timeEntries = $state<TimeEntry[]>([]);
	let timeEntryTypes = $state<TimeEntryType[]>([]);
	let loadingEntries = $state(true);
	let loadingTypes = $state(true);
	let entriesError = $state<string | null>(null);

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

	onMount(() => {
		loadEntries();
		loadTypes();
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
/>

<AuditLogDialog
	bind:open={auditSheetOpen}
	entry={auditSheetEntry}
	onClose={handleAuditSheetClose}
/>

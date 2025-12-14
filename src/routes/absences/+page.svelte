<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import AbsenceCard from '$lib/components/AbsenceCard.svelte';
	import AbsenceRequestModal from './AbsenceRequestModal.svelte';
	import AbsenceCancelDialog from './AbsenceCancelDialog.svelte';
	import {
		fetchMyAbsences,
		fetchAbsenceStats,
		type AbsenceResponse,
		type AbsenceStatus
	} from '$lib/api/absences';
	import { isAdmin as isAdminStore } from '$lib/stores/auth';
	import PendingAbsencesWidget from '../PendingAbsencesWidget.svelte';

	let isAdmin = $state(false);
	$effect(() => {
		const unsub = isAdminStore.subscribe((value) => {
			isAdmin = value;
		});
		return unsub;
	});

	let absences = $state<AbsenceResponse[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let adminPendingCount = $state(0);
	let loadingAdminStats = $state(true);

	let activeTab = $state<'all' | AbsenceStatus>('all');
	let requestModalOpen = $state(false);
	let cancelDialogOpen = $state(false);
	let selectedAbsence = $state<AbsenceResponse | null>(null);

	const filteredAbsences = $derived(
		activeTab === 'all' ? absences : absences.filter((a) => a.status === activeTab)
	);

	const pendingCount = $derived(absences.filter((a) => a.status === 'PENDING').length);
	const approvedCount = $derived(absences.filter((a) => a.status === 'APPROVED').length);

	async function loadAbsences() {
		loading = true;
		error = null;
		try {
			absences = await fetchMyAbsences();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar las ausencias';
		} finally {
			loading = false;
		}
	}

	function handleNewRequest() {
		requestModalOpen = true;
	}

	function handleRequestClose() {
		// Nothing specific needed
	}

	function handleRequestSuccess() {
		loadAbsences();
	}

	function handleCancelAbsence(absence: AbsenceResponse) {
		selectedAbsence = absence;
		cancelDialogOpen = true;
	}

	function handleCancelDialogClose() {
		selectedAbsence = null;
	}

	function handleCancelSuccess() {
		loadAbsences();
	}

	async function loadAdminStats() {
		if (!isAdmin) return;
		loadingAdminStats = true;
		try {
			const stats = await fetchAbsenceStats();
			adminPendingCount = stats.pending;
		} catch {
			// Silently fail - widget just won't show
		} finally {
			loadingAdminStats = false;
		}
	}

	onMount(() => {
		loadAbsences();
	});

	// Load admin stats when isAdmin becomes true
	$effect(() => {
		if (isAdmin) {
			loadAdminStats();
		}
	});
</script>

<div class="grow flex flex-col gap-6 p-6">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<Button variant="ghost" size="sm" onclick={() => goto(resolve('/'))}>
				<span class="material-symbols-rounded text-lg!">arrow_back</span>
			</Button>
			<h1 class="text-2xl font-semibold tracking-tight flex items-center gap-2">
				<span class="material-symbols-rounded text-3xl!">beach_access</span>
				Mis Ausencias
			</h1>
		</div>
		<div class="flex items-center gap-2">
			<Button onclick={handleNewRequest}>
				<span class="material-symbols-rounded text-lg! mr-2">add</span>
				Nueva solicitud
			</Button>
			{#if isAdmin}
				<Button variant="outline" href="{resolve('/admin')}?tab=ausencias">
					<span class="material-symbols-rounded text-lg! mr-2">admin_panel_settings</span>
					Gestionar
				</Button>
			{/if}
		</div>
	</div>

	<!-- Admin pending absences widget -->
	{#if isAdmin}
		<div class="max-w-5xl mx-auto w-full">
			<PendingAbsencesWidget pendingCount={adminPendingCount} loading={loadingAdminStats} />
		</div>
	{/if}

	<!-- Quick Stats -->
	{#if !loading && !error}
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto w-full">
			<div class="p-4 bg-muted rounded-lg text-center">
				<p class="text-2xl font-bold">{absences.length}</p>
				<p class="text-sm text-muted-foreground">Total solicitudes</p>
			</div>
			{#if pendingCount > 0}
				<div class="p-4 bg-yellow-500/10 rounded-lg text-center">
					<p class="text-2xl font-bold text-yellow-600">{pendingCount}</p>
					<p class="text-sm text-muted-foreground">Pendientes</p>
				</div>
			{/if}
			<div class="p-4 bg-success/10 rounded-lg text-center">
				<p class="text-2xl font-bold text-success">{approvedCount}</p>
				<p class="text-sm text-muted-foreground">Aprobadas</p>
			</div>
		</div>
	{/if}

	<Card class="w-full max-w-5xl mx-auto">
		<CardHeader>
			<CardTitle class="sr-only">Lista de ausencias</CardTitle>
		</CardHeader>
		<CardContent>
			{#if loading}
				<div class="space-y-4">
					{#each Array.from({ length: 3 }, (_, i) => i) as i (i)}
						<Skeleton class="h-28 w-full" />
					{/each}
				</div>
			{:else if error}
				<div class="flex flex-col items-center justify-center py-12 text-destructive">
					<span class="material-symbols-rounded text-4xl! mb-2">error</span>
					<p>{error}</p>
					<Button variant="outline" class="mt-4" onclick={loadAbsences}>
						<span class="material-symbols-rounded text-lg! mr-2">refresh</span>
						Reintentar
					</Button>
				</div>
			{:else}
				<Tabs bind:value={activeTab} class="w-full">
					<TabsList class="mb-4">
						<TabsTrigger value="all">
							Todas ({absences.length})
						</TabsTrigger>
						<TabsTrigger value="PENDING">
							Pendientes ({pendingCount})
						</TabsTrigger>
						<TabsTrigger value="APPROVED">
							Aprobadas ({approvedCount})
						</TabsTrigger>
						<TabsTrigger value="REJECTED">Rechazadas</TabsTrigger>
					</TabsList>

					<TabsContent value={activeTab}>
						{#if filteredAbsences.length === 0}
							<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
								<span class="material-symbols-rounded text-4xl! mb-2">event_busy</span>
								<p>No hay ausencias {activeTab !== 'all' ? 'en esta categoría' : ''}</p>
								<Button variant="outline" class="mt-4" onclick={handleNewRequest}>
									<span class="material-symbols-rounded text-lg! mr-2">add</span>
									Solicitar ausencia
								</Button>
							</div>
						{:else}
							<div class="space-y-4">
								{#each filteredAbsences as absence (absence.id)}
									<AbsenceCard {absence} onCancel={handleCancelAbsence} />
								{/each}
							</div>
						{/if}
					</TabsContent>
				</Tabs>
			{/if}
		</CardContent>
	</Card>
</div>

<AbsenceRequestModal
	bind:open={requestModalOpen}
	onClose={handleRequestClose}
	onSuccess={handleRequestSuccess}
/>

<AbsenceCancelDialog
	bind:open={cancelDialogOpen}
	absence={selectedAbsence}
	onClose={handleCancelDialogClose}
	onSuccess={handleCancelSuccess}
/>

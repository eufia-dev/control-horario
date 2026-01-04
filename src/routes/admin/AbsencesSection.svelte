<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Badge } from '$lib/components/ui/badge';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import AbsenceCard from '$lib/components/AbsenceCard.svelte';
	import AbsenceReviewModal from './AbsenceReviewModal.svelte';
	import AbsenceCancelDialog from '$lib/components/AbsenceCancelDialog.svelte';
	import {
		fetchAllAbsences,
		fetchAbsenceStats,
		type AbsenceResponse,
		type AbsenceStats
	} from '$lib/api/absences';

	let absences = $state<AbsenceResponse[]>([]);
	let stats = $state<AbsenceStats | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let activeTab = $state<'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'all'>('PENDING');
	let reviewModalOpen = $state(false);
	let cancelDialogOpen = $state(false);
	let selectedAbsence = $state<AbsenceResponse | null>(null);

	const filteredAbsences = $derived(
		activeTab === 'all' ? absences : absences.filter((a) => a.status === activeTab)
	);

	const totalAbsences = $derived(
		stats ? stats.pending + stats.approved + stats.rejected + stats.cancelled : 0
	);

	async function loadData() {
		loading = true;
		error = null;
		try {
			const [absencesData, statsData] = await Promise.all([
				fetchAllAbsences(),
				fetchAbsenceStats()
			]);
			absences = absencesData;
			stats = statsData;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar las ausencias';
		} finally {
			loading = false;
		}
	}

	function handleReviewAbsence(absence: AbsenceResponse) {
		selectedAbsence = absence;
		reviewModalOpen = true;
	}

	function handleReviewClose() {
		selectedAbsence = null;
	}

	function handleReviewSuccess() {
		loadData();
	}

	function handleCancelAbsence(absence: AbsenceResponse) {
		selectedAbsence = absence;
		cancelDialogOpen = true;
	}

	function handleCancelDialogClose() {
		selectedAbsence = null;
	}

	function handleCancelSuccess() {
		loadData();
	}

	onMount(() => {
		loadData();
	});
</script>

<div class="flex flex-col gap-6">
	<!-- Stats Cards -->
	{#if loading}
		<div class="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-6xl mx-auto w-full">
			{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
				<Skeleton class="h-20 w-full rounded-lg" />
			{/each}
		</div>
	{:else if stats}
		<div class="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-6xl mx-auto w-full">
			<button
				type="button"
				class="p-4 bg-yellow-500/10 rounded-lg text-center hover:bg-yellow-500/20 transition-colors relative {activeTab ===
				'PENDING'
					? 'ring-2 ring-yellow-500'
					: ''}"
				onclick={() => (activeTab = 'PENDING')}
			>
				{#if stats.pending > 0}
					<Badge variant="destructive" class="absolute top-2 right-2">
						{stats.pending}
					</Badge>
				{/if}
				<p class="text-2xl font-bold text-yellow-600">{stats.pending}</p>
				<p class="text-sm text-muted-foreground">Pendientes</p>
			</button>
			<button
				type="button"
				class="p-4 bg-success/10 rounded-lg text-center hover:bg-success/20 transition-colors {activeTab ===
				'APPROVED'
					? 'ring-2 ring-success'
					: ''}"
				onclick={() => (activeTab = 'APPROVED')}
			>
				<p class="text-2xl font-bold text-success">{stats.approved}</p>
				<p class="text-sm text-muted-foreground">Aprobadas</p>
			</button>
			<button
				type="button"
				class="p-4 bg-destructive/10 rounded-lg text-center hover:bg-destructive/20 transition-colors {activeTab ===
				'REJECTED'
					? 'ring-2 ring-destructive'
					: ''}"
				onclick={() => (activeTab = 'REJECTED')}
			>
				<p class="text-2xl font-bold text-destructive">{stats.rejected}</p>
				<p class="text-sm text-muted-foreground">Rechazadas</p>
			</button>
			<button
				type="button"
				class="p-4 bg-muted/50 rounded-lg text-center hover:bg-muted transition-colors {activeTab ===
				'CANCELLED'
					? 'ring-2 ring-muted-foreground'
					: ''}"
				onclick={() => (activeTab = 'CANCELLED')}
			>
				<p class="text-2xl font-bold">{stats.cancelled}</p>
				<p class="text-sm text-muted-foreground">Canceladas</p>
			</button>
			<button
				type="button"
				class="p-4 bg-muted rounded-lg text-center hover:bg-muted/80 transition-colors {activeTab ===
				'all'
					? 'ring-2 ring-primary'
					: ''}"
				onclick={() => (activeTab = 'all')}
			>
				<p class="text-2xl font-bold">{totalAbsences}</p>
				<p class="text-sm text-muted-foreground">Total</p>
			</button>
		</div>
	{/if}

	<Card class="w-full max-w-6xl mx-auto">
		<CardHeader>
			<CardTitle class="text-2xl font-semibold tracking-tight">Gestión de Ausencias</CardTitle>
		</CardHeader>
		<CardContent>
			{#if loading}
				<div class="space-y-4">
					{#each Array.from({ length: 3 }, (_, i) => i) as i (i)}
						<Skeleton class="h-32 w-full" />
					{/each}
				</div>
			{:else if error}
				<div class="flex flex-col items-center justify-center py-12 text-destructive">
					<span class="material-symbols-rounded text-4xl! mb-2">error</span>
					<p>{error}</p>
					<Button variant="outline" class="mt-4" onclick={loadData}>
						<span class="material-symbols-rounded text-lg! mr-2">refresh</span>
						Reintentar
					</Button>
				</div>
			{:else}
				<Tabs bind:value={activeTab} class="w-full">
					<div class="mb-4 overflow-x-auto">
						<TabsList class="w-fit">
							<TabsTrigger value="PENDING">
								Pendientes
								{#if stats && stats.pending > 0}
									<Badge variant="destructive" class="ml-2">{stats.pending}</Badge>
								{/if}
							</TabsTrigger>
							<TabsTrigger value="APPROVED">Aprobadas</TabsTrigger>
							<TabsTrigger value="REJECTED">Rechazadas</TabsTrigger>
							<TabsTrigger value="CANCELLED">Canceladas</TabsTrigger>
							<TabsTrigger value="all">Todas</TabsTrigger>
						</TabsList>
					</div>

					<TabsContent value={activeTab}>
						{#if filteredAbsences.length === 0}
							<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
								<span class="material-symbols-rounded text-4xl! mb-2">inbox</span>
								<p>
									{#if activeTab === 'PENDING'}
										No hay solicitudes pendientes de revisión
									{:else}
										No hay solicitudes en esta categoría
									{/if}
								</p>
							</div>
						{:else}
							<div class="space-y-4">
								{#each filteredAbsences as absence (absence.id)}
									<div class="relative">
										<AbsenceCard {absence} showUser onCancel={handleCancelAbsence} />
										{#if absence.status === 'PENDING'}
											<div class="absolute top-4 right-4">
												<Button size="sm" onclick={() => handleReviewAbsence(absence)}>
													<span class="material-symbols-rounded text-lg! mr-2">rate_review</span>
													Revisar
												</Button>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</TabsContent>
				</Tabs>
			{/if}
		</CardContent>
	</Card>
</div>

<AbsenceReviewModal
	bind:open={reviewModalOpen}
	absence={selectedAbsence}
	onClose={handleReviewClose}
	onSuccess={handleReviewSuccess}
/>

<AbsenceCancelDialog
	bind:open={cancelDialogOpen}
	absence={selectedAbsence}
	onClose={handleCancelDialogClose}
	onSuccess={handleCancelSuccess}
	showUserName={true}
/>

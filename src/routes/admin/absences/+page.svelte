<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { auth, isAdmin as isAdminStore } from '$lib/stores/auth';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import AbsenceCard from '$lib/components/AbsenceCard.svelte';
	import AbsenceReviewModal from './AbsenceReviewModal.svelte';
	import {
		fetchAllAbsences,
		fetchAbsenceStats,
		type AbsenceResponse,
		type AbsenceStats
	} from '$lib/api/absences';

	let isAdmin = $state(false);
	$effect(() => {
		const unsub = isAdminStore.subscribe((value) => {
			isAdmin = value;
		});
		return unsub;
	});

	let absences = $state<AbsenceResponse[]>([]);
	let stats = $state<AbsenceStats | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let activeTab = $state<'PENDING' | 'APPROVED' | 'REJECTED' | 'all'>('PENDING');
	let reviewModalOpen = $state(false);
	let selectedAbsence = $state<AbsenceResponse | null>(null);

	const filteredAbsences = $derived(
		activeTab === 'all' ? absences : absences.filter((a) => a.status === activeTab)
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

	onMount(() => {
		const role = $auth.user?.role;
		if (role !== 'OWNER' && role !== 'ADMIN') {
			goto(resolve('/'));
			return;
		}
		loadData();
	});

	$effect(() => {
		const role = $auth.user?.role;
		if (!$auth.isInitializing && role !== 'OWNER' && role !== 'ADMIN') {
			goto(resolve('/'));
		}
	});
</script>

{#if isAdmin}
	<div class="grow flex flex-col gap-6 p-6">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Button variant="ghost" size="sm" onclick={() => goto(resolve('/admin'))}>
					<span class="material-symbols-rounded text-lg!">arrow_back</span>
				</Button>
				<h1 class="text-2xl font-semibold tracking-tight flex items-center gap-2">
					<span class="material-symbols-rounded text-3xl!">event_available</span>
					Gestión de Ausencias
				</h1>
			</div>
		</div>

		<!-- Stats Cards -->
		{#if stats && !loading}
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto w-full">
				<button
					type="button"
					class="p-4 bg-yellow-500/10 rounded-lg text-center hover:bg-yellow-500/20 transition-colors {activeTab ===
					'PENDING'
						? 'ring-2 ring-yellow-500'
						: ''}"
					onclick={() => (activeTab = 'PENDING')}
				>
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
					class="p-4 bg-muted rounded-lg text-center hover:bg-muted/80 transition-colors {activeTab ===
					'all'
						? 'ring-2 ring-primary'
						: ''}"
					onclick={() => (activeTab = 'all')}
				>
					<p class="text-2xl font-bold">
						{stats.pending + stats.approved + stats.rejected + stats.cancelled}
					</p>
					<p class="text-sm text-muted-foreground">Total</p>
				</button>
			</div>
		{/if}

		<Card class="w-full max-w-5xl mx-auto">
			<CardHeader>
				<CardTitle class="sr-only">Lista de solicitudes de ausencia</CardTitle>
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
						<TabsList class="mb-4">
							<TabsTrigger value="PENDING">
								Pendientes
								{#if stats && stats.pending > 0}
									<Badge variant="destructive" class="ml-2">{stats.pending}</Badge>
								{/if}
							</TabsTrigger>
							<TabsTrigger value="APPROVED">Aprobadas</TabsTrigger>
							<TabsTrigger value="REJECTED">Rechazadas</TabsTrigger>
							<TabsTrigger value="all">Todas</TabsTrigger>
						</TabsList>

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
											<AbsenceCard {absence} showUser />
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
{/if}

<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';
	import CompanyHolidayFormModal from '../company/CompanyHolidayFormModal.svelte';
	import CompanyHolidayDeleteDialog from '../company/CompanyHolidayDeleteDialog.svelte';
	import {
		fetchHolidays,
		fetchCompanyHolidays,
		syncHolidays,
		type HolidayResponse,
		type CompanyHolidayResponse
	} from '$lib/api/holidays';

	let holidays = $state<HolidayResponse[]>([]);
	let companyHolidays = $state<CompanyHolidayResponse[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let syncing = $state(false);

	let activeTab = $state<'public' | 'company'>('public');
	let selectedYear = $state(new Date().getFullYear());

	let formModalOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let selectedHoliday = $state<CompanyHolidayResponse | null>(null);

	const publicHolidays = $derived(holidays.filter((h) => h.type === 'public'));
	const nationalHolidays = $derived(publicHolidays.filter((h) => h.isNational));
	const regionalHolidays = $derived(publicHolidays.filter((h) => !h.isNational));

	async function loadHolidays() {
		loading = true;
		error = null;
		try {
			const [allHolidays, companyOnly] = await Promise.all([
				fetchHolidays(selectedYear),
				fetchCompanyHolidays()
			]);
			holidays = allHolidays;
			companyHolidays = companyOnly;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar los festivos';
		} finally {
			loading = false;
		}
	}

	async function handleSync() {
		syncing = true;
		try {
			await syncHolidays(selectedYear);
			await loadHolidays();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al sincronizar festivos';
		} finally {
			syncing = false;
		}
	}

	function handleAddHoliday() {
		formModalOpen = true;
	}

	function handleDeleteHoliday(holiday: CompanyHolidayResponse) {
		selectedHoliday = holiday;
		deleteDialogOpen = true;
	}

	function handleFormClose() {
		// Nothing specific needed
	}

	function handleDeleteClose() {
		selectedHoliday = null;
	}

	function handleSuccess() {
		loadHolidays();
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('es-ES', {
			day: 'numeric',
			month: 'short'
		});
	}

	function formatFullDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('es-ES', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	// Reload when year changes
	$effect(() => {
		loadHolidays();
	});

	onMount(() => {
		loadHolidays();
	});
</script>

<Card class="w-full max-w-6xl 2xl:max-w-7xl mx-auto">
	<CardHeader class="flex flex-row items-center justify-between space-y-0 flex-wrap gap-4">
		<CardTitle class="text-2xl font-semibold tracking-tight flex items-center gap-2">
			<span class="material-symbols-rounded text-2xl!">calendar_month</span>
			Días Festivos
		</CardTitle>
		<div class="flex items-center gap-2">
			<div class="flex items-center gap-4">
				<Button
					variant="outline"
					size="sm"
					aria-label="Año anterior"
					onclick={() => (selectedYear = selectedYear - 1)}
					disabled={loading || syncing}
				>
					<span class="material-symbols-rounded text-lg!">chevron_left</span>
				</Button>
				<div class="text-center text-sm font-medium tabular-nums">{selectedYear}</div>
				<Button
					variant="outline"
					size="sm"
					aria-label="Año siguiente"
					onclick={() => (selectedYear = selectedYear + 1)}
					disabled={loading || syncing}
				>
					<span class="material-symbols-rounded text-lg!">chevron_right</span>
				</Button>
			</div>
			<Tooltip>
				<TooltipTrigger>
					<Button variant="outline" size="sm" onclick={handleSync} disabled={syncing || loading}>
						<span class="material-symbols-rounded text-lg! {syncing ? 'animate-spin' : ''}">
							{syncing ? 'progress_activity' : 'sync'}
						</span>
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>Sincronizar festivos desde API</p>
				</TooltipContent>
			</Tooltip>
		</div>
	</CardHeader>
	<CardContent>
		{#if loading}
			<div class="space-y-4">
				{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
					<Skeleton class="h-12 w-full" />
				{/each}
			</div>
		{:else if error}
			<div class="flex flex-col items-center justify-center py-8 text-destructive">
				<span class="material-symbols-rounded text-4xl! mb-2">error</span>
				<p>{error}</p>
				<Button variant="outline" class="mt-4" onclick={loadHolidays}>
					<span class="material-symbols-rounded text-lg! mr-2">refresh</span>
					Reintentar
				</Button>
			</div>
		{:else}
			<Tabs bind:value={activeTab} class="w-full">
				<div class="mb-4 overflow-x-auto">
					<TabsList class="w-fit">
						<TabsTrigger value="public">
							Festivos Públicos ({publicHolidays.length})
						</TabsTrigger>
						<TabsTrigger value="company">
							Festivos de Empresa ({companyHolidays.length})
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="public">
					{#if publicHolidays.length === 0}
						<div class="flex flex-col items-center justify-center py-8 text-muted-foreground">
							<span class="material-symbols-rounded text-4xl! mb-2">event_busy</span>
							<p>No hay festivos públicos para {selectedYear}</p>
							<Button variant="outline" class="mt-4" onclick={handleSync} disabled={syncing}>
								<span class="material-symbols-rounded text-lg! mr-2">sync</span>
								Sincronizar festivos
							</Button>
						</div>
					{:else}
						<div class="space-y-6">
							<!-- National Holidays -->
							{#if nationalHolidays.length > 0}
								<div>
									<h3
										class="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2"
									>
										<span class="material-symbols-rounded text-lg!">flag</span>
										Festivos Nacionales ({nationalHolidays.length})
									</h3>
									<div class="grid gap-2">
										{#each nationalHolidays as holiday (holiday.id)}
											<Tooltip>
												<TooltipTrigger class="w-full">
													<div
														class="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
													>
														<div class="flex items-center gap-3">
															<Badge variant="secondary" class="bg-blue-500/20 text-blue-600">
																{formatDate(holiday.date)}
															</Badge>
															<span>{holiday.localName || holiday.name}</span>
														</div>
														<Badge variant="outline">Nacional</Badge>
													</div>
												</TooltipTrigger>
												<TooltipContent>
													<p class="capitalize">{formatFullDate(holiday.date)}</p>
												</TooltipContent>
											</Tooltip>
										{/each}
									</div>
								</div>
							{/if}

							<!-- Regional Holidays -->
							{#if regionalHolidays.length > 0}
								<div>
									<h3
										class="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2"
									>
										<span class="material-symbols-rounded text-lg!">location_on</span>
										Festivos Autonómicos ({regionalHolidays.length})
									</h3>
									<div class="grid gap-2">
										{#each regionalHolidays as holiday (holiday.id)}
											<Tooltip>
												<TooltipTrigger class="w-full">
													<div
														class="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
													>
														<div class="flex items-center gap-3">
															<Badge variant="secondary" class="bg-purple-500/20 text-purple-600">
																{formatDate(holiday.date)}
															</Badge>
															<span>{holiday.localName || holiday.name}</span>
														</div>
														{#if holiday.regionCode}
															<Badge variant="outline">{holiday.regionCode}</Badge>
														{/if}
													</div>
												</TooltipTrigger>
												<TooltipContent>
													<p class="capitalize">{formatFullDate(holiday.date)}</p>
												</TooltipContent>
											</Tooltip>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</TabsContent>

				<TabsContent value="company">
					<div class="flex justify-end mb-4">
						<Button onclick={handleAddHoliday}>
							<span class="material-symbols-rounded text-lg! mr-2">add</span>
							Añadir festivo
						</Button>
					</div>

					{#if companyHolidays.length === 0}
						<div class="flex flex-col items-center justify-center py-8 text-muted-foreground">
							<span class="material-symbols-rounded text-4xl! mb-2">event</span>
							<p>No hay festivos de empresa configurados</p>
							<p class="text-sm mt-1">Añade aquí los festivos locales y cierres especiales.</p>
						</div>
					{:else}
						<div class="grid gap-2">
							{#each companyHolidays as holiday (holiday.id)}
								<div class="flex items-center justify-between p-3 border rounded-lg">
									<div class="flex items-center gap-3">
										<Badge variant="secondary" class="bg-green-500/20 text-green-600">
											{formatDate(holiday.date)}
										</Badge>
										<span>{holiday.name}</span>
										{#if holiday.isRecurring}
											<Badge variant="outline" class="text-xs">
												<span class="material-symbols-rounded text-sm! mr-1">repeat</span>
												Anual
											</Badge>
										{/if}
									</div>
									<Button
										variant="ghost"
										size="sm"
										class="text-destructive hover:text-destructive hover:bg-destructive/10"
										onclick={() => handleDeleteHoliday(holiday)}
									>
										<span class="material-symbols-rounded text-lg!">delete</span>
									</Button>
								</div>
							{/each}
						</div>
					{/if}
				</TabsContent>
			</Tabs>
		{/if}
	</CardContent>
</Card>

<CompanyHolidayFormModal
	bind:open={formModalOpen}
	onClose={handleFormClose}
	onSuccess={handleSuccess}
/>

<CompanyHolidayDeleteDialog
	bind:open={deleteDialogOpen}
	holiday={selectedHoliday}
	onClose={handleDeleteClose}
	onSuccess={handleSuccess}
/>

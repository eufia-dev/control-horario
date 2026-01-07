<script lang="ts">
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Combobox } from '$lib/components/ui/combobox';
	import ProjectLabel from '$lib/components/ProjectLabel.svelte';
	import { formatProjectLabel } from '$lib/utils';
	import {
		getActiveTimer,
		startTimer,
		stopTimer,
		switchTimer,
		type ActiveTimer,
		type TimeEntryType
	} from '$lib/api/time-entries';
	import type { Project } from '$lib/api/projects';
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		projects: Project[];
		timeEntryTypes: TimeEntryType[];
		latestProjectId: string | null;
		loadingProjects?: boolean;
		loadingTypes?: boolean;
		onTimerStop?: () => void;
		onTimerSwitch?: () => void;
		onActiveTimerChange?: (hasActiveTimer: boolean) => void;
	}

	let {
		projects,
		timeEntryTypes,
		latestProjectId,
		loadingProjects = false,
		loadingTypes = false,
		onTimerStop,
		onTimerSwitch,
		onActiveTimerChange
	}: Props = $props();

	let activeTimer = $state<ActiveTimer | null>(null);
	let loadingTimer = $state(true);

	let selectedProjectId = $state<string | undefined>(undefined);
	let selectedEntryType = $state<string | undefined>(undefined);
	let isInOffice = $state(true);
	let startingTimer = $state(false);
	let stoppingTimer = $state(false);

	let showSwitchForm = $state(false);
	let switchProjectId = $state<string | undefined>(undefined);
	let switchEntryType = $state<string | undefined>(undefined);
	let switchIsInOffice = $state(true);
	let switchingTimer = $state(false);

	let elapsedSeconds = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	const selectedType = $derived(timeEntryTypes.find((t) => t.value === selectedEntryType));
	const switchType = $derived(timeEntryTypes.find((t) => t.value === switchEntryType));
	const activeProjects = $derived(projects.filter((p) => p.isActive));
	const hasProjects = $derived(activeProjects.length > 0);
	const isWorkType = $derived(selectedType?.name === 'Trabajo');
	const isSwitchWorkType = $derived(switchType?.name === 'Trabajo');

	const defaultProjectId = $derived.by(() => {
		if (latestProjectId) {
			const project = activeProjects.find((p) => p.id === latestProjectId);
			if (project) return latestProjectId;
		}
		return activeProjects.length > 0 ? activeProjects[0].id : undefined;
	});

	const timeEntryTypeLookup = $derived(
		timeEntryTypes.reduce<Record<string, TimeEntryType>>((acc, type) => {
			acc[type.value] = type;
			return acc;
		}, {})
	);

	function getEntryTypeName(value?: string, fallback?: string) {
		if (!value) return fallback ?? '-';
		return timeEntryTypeLookup[value]?.name ?? fallback ?? '-';
	}

	const canStartTimer = $derived(
		selectedEntryType &&
			(isWorkType && hasProjects ? selectedProjectId : true) &&
			!startingTimer &&
			!activeTimer
	);

	// Set default entry type
	$effect(() => {
		if (timeEntryTypes.length > 0 && !selectedEntryType) {
			const trabajoType = timeEntryTypes.find((t) => t.name === 'Trabajo');
			if (trabajoType) {
				selectedEntryType = trabajoType.value;
			} else {
				selectedEntryType = timeEntryTypes[0].value;
			}
		}
	});

	// Handle project selection when switching entry types for timer form
	$effect(() => {
		if (isWorkType && hasProjects && !selectedProjectId && !loadingProjects && defaultProjectId) {
			selectedProjectId = defaultProjectId;
		} else if ((!isWorkType || !hasProjects) && selectedProjectId) {
			selectedProjectId = undefined;
		}
	});

	// Handle project selection when switching entry types for switch form
	$effect(() => {
		if (isSwitchWorkType && hasProjects && !switchProjectId && showSwitchForm && defaultProjectId) {
			switchProjectId = defaultProjectId;
		} else if ((!isSwitchWorkType || !hasProjects) && switchProjectId) {
			switchProjectId = undefined;
		}
	});

	function startElapsedTimer() {
		if (timerInterval) {
			clearInterval(timerInterval);
		}
		if (activeTimer) {
			const startTime = new Date(activeTimer.startTime).getTime();
			elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
			timerInterval = setInterval(() => {
				if (activeTimer) {
					const startTime = new Date(activeTimer.startTime).getTime();
					elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
				}
			}, 1000);
		}
	}

	function stopElapsedTimer() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
		elapsedSeconds = 0;
	}

	function formatElapsedTime(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}

	async function loadActiveTimer() {
		loadingTimer = true;
		try {
			activeTimer = await getActiveTimer();
			if (activeTimer) {
				startElapsedTimer();
			}
			onActiveTimerChange?.(!!activeTimer);
		} catch (e) {
			console.error('Error loading active timer:', e);
		} finally {
			loadingTimer = false;
		}
	}

	async function handleStartTimer() {
		if (!selectedEntryType) return;
		if (isWorkType && hasProjects && !selectedProjectId) return;

		startingTimer = true;
		try {
			activeTimer = await startTimer({
				projectId: isWorkType && hasProjects ? selectedProjectId : undefined,
				entryType: selectedEntryType,
				isInOffice
			});
			startElapsedTimer();
			onActiveTimerChange?.(true);
		} catch (e) {
			console.error('Error starting timer:', e);
		} finally {
			startingTimer = false;
		}
	}

	async function handleStopTimer() {
		stoppingTimer = true;
		try {
			await stopTimer();
			activeTimer = null;
			stopElapsedTimer();
			onActiveTimerChange?.(false);
			onTimerStop?.();
		} catch (e) {
			console.error('Error stopping timer:', e);
		} finally {
			stoppingTimer = false;
		}
	}

	function handleShowSwitchForm() {
		if (activeTimer) {
			switchEntryType = activeTimer.entryType;
			switchIsInOffice = activeTimer.isInOffice;
		}
		switchProjectId = undefined;
		showSwitchForm = true;
	}

	function handleCancelSwitch() {
		showSwitchForm = false;
		switchProjectId = undefined;
		switchEntryType = undefined;
	}

	async function handleSwitchTimer() {
		if (!switchEntryType) return;
		if (isSwitchWorkType && hasProjects && !switchProjectId) return;

		switchingTimer = true;
		try {
			const result = await switchTimer({
				projectId: isSwitchWorkType ? switchProjectId : undefined,
				entryType: switchEntryType,
				isInOffice: switchIsInOffice
			});
			activeTimer = result.activeTimer;
			startElapsedTimer();
			showSwitchForm = false;
			onTimerSwitch?.();
		} catch (e) {
			console.error('Error switching timer:', e);
		} finally {
			switchingTimer = false;
		}
	}

	onMount(() => {
		loadActiveTimer();
	});

	onDestroy(() => {
		stopElapsedTimer();
	});
</script>

<Card class="flex-1 min-w-0">
	<CardHeader>
		<CardTitle class="text-2xl font-semibold tracking-tight flex items-center gap-3">
			<span class="material-symbols-rounded text2xl!">timer</span>
			Temporizador
		</CardTitle>
	</CardHeader>
	<CardContent>
		{#if loadingTimer || loadingProjects || loadingTypes}
			<div class="flex flex-col gap-4">
				<Skeleton class="h-10 w-full" />
				<Skeleton class="h-10 w-full" />
				<div class="flex gap-4">
					<Skeleton class="h-10 w-32" />
				</div>
			</div>
		{:else if activeTimer}
			<div class="flex flex-col gap-6">
				<div class="flex items-center justify-between flex-wrap gap-4">
					<div class="flex flex-col gap-1">
						<div class="flex items-center gap-2">
							<span class="relative flex h-3 w-3">
								<span
									class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success"
								></span>
								<span class="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
							</span>
							<span class="text-sm font-medium text-success">En curso</span>
						</div>
						<div class="text-4xl font-mono font-bold tracking-tight">
							{formatElapsedTime(elapsedSeconds)}
						</div>
					</div>
					<div class="flex flex-col gap-1 text-right">
						{#if activeTimer.project}
							<ProjectLabel project={activeTimer.project} />
						{/if}
						<div class="flex items-center gap-2 justify-end">
							<Badge variant="secondary">
								{getEntryTypeName(
									activeTimer.entryType,
									activeTimer.timeEntryType?.name ?? activeTimer.entryTypeName ?? 'Tipo'
								)}
							</Badge>
							<Badge variant={activeTimer.isInOffice ? 'default' : 'outline'}>
								{activeTimer.isInOffice ? 'Oficina' : 'Remoto'}
							</Badge>
						</div>
					</div>
				</div>

				{#if showSwitchForm}
					<!-- Switch Task Form -->
					<div class="border rounded-lg p-4 bg-muted/30 space-y-4">
						<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
							<span class="material-symbols-rounded text-lg!">swap_horiz</span>
							Cambiar a otra tarea
						</div>
						<div class="flex flex-col gap-4">
							<div class="grid gap-2">
								<Label>Tipo</Label>
								<Select type="single" bind:value={switchEntryType} disabled={switchingTimer}>
									<SelectTrigger class="w-full">
										{#if switchType}
											{switchType.name}
										{:else}
											<span class="text-muted-foreground">Seleccionar tipo</span>
										{/if}
									</SelectTrigger>
									<SelectContent>
										{#each timeEntryTypes as type (type.value)}
											<SelectItem value={type.value} label={type.name} />
										{/each}
									</SelectContent>
								</Select>
							</div>
							{#if isSwitchWorkType && hasProjects}
								<div class="grid gap-2">
									<Label>Proyecto</Label>
									<Combobox
										items={activeProjects}
										bind:value={switchProjectId}
										getItemValue={(p) => p.id}
										getItemLabel={(p) => formatProjectLabel(p)}
										placeholder="Seleccionar proyecto"
										searchPlaceholder="Buscar proyecto..."
										emptyMessage="No se encontró ningún proyecto."
										disabled={switchingTimer}
									>
										{#snippet selectedSnippet({ item })}
											<ProjectLabel project={item} />
										{/snippet}
										{#snippet itemSnippet({ item })}
											<ProjectLabel project={item} className="flex-1 min-w-0" />
										{/snippet}
									</Combobox>
								</div>
							{/if}
						</div>
						<div class="flex items-center gap-3">
							<Switch
								id="switchIsInOffice"
								bind:checked={switchIsInOffice}
								disabled={switchingTimer}
							/>
							<Label for="switchIsInOffice" class="cursor-pointer">
								{switchIsInOffice ? 'Oficina' : 'Remoto'}
							</Label>
						</div>
						<div class="flex gap-2 justify-end">
							<Button variant="outline" onclick={handleCancelSwitch} disabled={switchingTimer}>
								Cancelar
							</Button>
							<Button
								onclick={handleSwitchTimer}
								disabled={!switchEntryType ||
									(isSwitchWorkType && hasProjects && !switchProjectId) ||
									switchingTimer}
							>
								{#if switchingTimer}
									<span class="material-symbols-rounded animate-spin text-base"
										>progress_activity</span
									>
								{/if}
								Cambiar tarea
							</Button>
						</div>
					</div>
				{:else}
					<!-- Timer Actions -->
					<div class="flex gap-3 flex-wrap">
						<Button
							variant="destructive"
							onclick={handleStopTimer}
							disabled={stoppingTimer}
							class="flex-1 sm:flex-none"
						>
							{#if stoppingTimer}
								<span class="material-symbols-rounded mr-2 animate-spin text-base"
									>progress_activity</span
								>
							{:else}
								<span class="material-symbols-rounded mr-2 text-lg!">stop</span>
							{/if}
							Detener
						</Button>
						<Button
							variant="outline"
							onclick={handleShowSwitchForm}
							disabled={stoppingTimer}
							class="flex-1 sm:flex-none"
						>
							<span class="material-symbols-rounded mr-2 text-lg!">swap_horiz</span>
							Cambiar tarea
						</Button>
					</div>
				{/if}
			</div>
		{:else}
			<!-- Start Timer Form -->
			<div class="flex flex-col gap-4">
				<div class="grid gap-2">
					<Label>Tipo</Label>
					<Select type="single" bind:value={selectedEntryType} disabled={startingTimer}>
						<SelectTrigger class="w-full">
							{#if selectedType}
								{selectedType.name}
							{:else}
								<span class="text-muted-foreground">Seleccionar tipo</span>
							{/if}
						</SelectTrigger>
						<SelectContent>
							{#each timeEntryTypes as type (type.value)}
								<SelectItem value={type.value} label={type.name} />
							{/each}
						</SelectContent>
					</Select>
				</div>
				{#if hasProjects}
					<div
						class="grid gap-2 {isWorkType ? '' : 'opacity-0 pointer-events-none select-none'}"
						aria-hidden={!isWorkType}
					>
						<Label>Proyecto</Label>
						<Combobox
							items={activeProjects}
							bind:value={selectedProjectId}
							getItemValue={(p) => p.id}
							getItemLabel={(p) => formatProjectLabel(p)}
							placeholder="Seleccionar proyecto"
							searchPlaceholder="Buscar proyecto..."
							emptyMessage="No se encontró ningún proyecto."
							disabled={startingTimer}
						>
							{#snippet selectedSnippet({ item })}
								<ProjectLabel project={item} />
							{/snippet}
							{#snippet itemSnippet({ item })}
								<ProjectLabel project={item} className="flex-1 min-w-0" />
							{/snippet}
						</Combobox>
					</div>
				{/if}
				<div class="flex items-center justify-between flex-wrap gap-4">
					<div class="flex items-center gap-3">
						<Switch id="isInOffice" bind:checked={isInOffice} disabled={startingTimer} />
						<Label for="isInOffice" class="cursor-pointer">
							{isInOffice ? 'Oficina' : 'Remoto'}
						</Label>
					</div>
					<Button onclick={handleStartTimer} disabled={!canStartTimer}>
						{#if startingTimer}
							<span class="material-symbols-rounded animate-spin text-base">progress_activity</span>
						{:else}
							<span class="material-symbols-rounded text-lg!">play_arrow</span>
						{/if}
						Iniciar temporizador
					</Button>
				</div>
			</div>
		{/if}
	</CardContent>
</Card>

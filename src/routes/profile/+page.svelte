<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { auth, type AuthUser } from '$lib/stores/auth';
	import { updateProfile } from '$lib/auth';
	import { stringToColor, getInitials } from '$lib/utils';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import {
		Tooltip,
		TooltipContent,
		TooltipProvider,
		TooltipTrigger
	} from '$lib/components/ui/tooltip';
	import ScheduleEditor from '../admin/ScheduleEditor.svelte';
	import { fetchMyCompany, type Company } from '$lib/api/companies';
	import {
		fetchMyEffectiveSchedule,
		updateMyOverrides,
		deleteMyOverrides,
		validateSchedule,
		DAY_NAMES,
		type WorkScheduleDay
	} from '$lib/api/work-schedules';

	let user = $state<AuthUser | null>(null);

	let isEditing = $state(false);
	let editName = $state('');
	let editEmail = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);

	// Schedule state
	let company = $state<Company | null>(null);
	let loadingCompany = $state(true);
	let mySchedule = $state<WorkScheduleDay[]>([]);
	let loadingSchedule = $state(true);
	let savingSchedule = $state(false);
	let deletingOverrides = $state(false);
	let scheduleError = $state<string | null>(null);

	const canEditSchedule = $derived(company?.allowUserEditSchedule ?? false);

	$effect(() => {
		const unsubscribe = auth.subscribe((state) => {
			user = state.user;
		});
		return unsubscribe;
	});

	const avatarColor = $derived(user?.id ? stringToColor(user.id) : '#6b7280');
	const initials = $derived(user?.name ? getInitials(user.name) : '');

	function startEditing() {
		if (user) {
			editName = user.name;
			editEmail = user.email;
			error = null;
			isEditing = true;
		}
	}

	function cancelEditing() {
		isEditing = false;
		editName = '';
		editEmail = '';
		error = null;
	}

	async function handleSave() {
		error = null;

		if (!editName.trim()) {
			error = 'El nombre es obligatorio';
			return;
		}

		if (!editEmail.trim()) {
			error = 'El email es obligatorio';
			return;
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(editEmail.trim())) {
			error = 'El formato del email no es válido';
			return;
		}

		submitting = true;

		try {
			await updateProfile(editName.trim(), editEmail.trim());
			isEditing = false;
			editName = '';
			editEmail = '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al actualizar el perfil';
		} finally {
			submitting = false;
		}
	}

	async function loadCompany() {
		loadingCompany = true;
		try {
			company = await fetchMyCompany();
		} catch (e) {
			console.error('Error loading company:', e);
		} finally {
			loadingCompany = false;
		}
	}

	async function loadSchedule() {
		loadingSchedule = true;
		scheduleError = null;
		try {
			const response = await fetchMyEffectiveSchedule();
			mySchedule = response.days;
		} catch (e) {
			scheduleError = e instanceof Error ? e.message : 'Error al cargar el horario';
		} finally {
			loadingSchedule = false;
		}
	}

	async function handleSaveSchedule() {
		const validation = validateSchedule({ days: mySchedule });
		if (!validation.valid) {
			scheduleError = validation.error;
			return;
		}

		savingSchedule = true;
		scheduleError = null;
		try {
			const response = await updateMyOverrides({ days: mySchedule });
			mySchedule = response.days;
		} catch (e) {
			scheduleError = e instanceof Error ? e.message : 'Error al guardar el horario';
		} finally {
			savingSchedule = false;
		}
	}

	async function handleResetSchedule() {
		deletingOverrides = true;
		scheduleError = null;
		try {
			await deleteMyOverrides();
			// Reload to get the effective schedule (which will now be company defaults)
			await loadSchedule();
		} catch (e) {
			scheduleError = e instanceof Error ? e.message : 'Error al restablecer el horario';
		} finally {
			deletingOverrides = false;
		}
	}

	function formatScheduleSummary(days: WorkScheduleDay[]): string {
		if (days.length === 0) return 'Sin horario definido';
		const sortedDays = [...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
		return sortedDays.map((d) => `${DAY_NAMES[d.dayOfWeek].slice(0, 3)}`).join(', ');
	}

	onMount(() => {
		loadCompany();
		loadSchedule();
	});
</script>

<div class="grow bg-background px-4 py-8">
	<div class="max-w-6xl mx-auto">
		<Button
			variant="ghost"
			size="sm"
			aria-label="Volver al inicio"
			onclick={() => goto(resolve('/'))}
			class="text-muted-foreground mb-4"
		>
			<span class="material-symbols-rounded text-xl!">arrow_back</span>
			Volver al inicio
		</Button>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Left Column: Profile Info -->
			<Card class="h-fit">
				<CardHeader class="space-y-4">
					<div class="flex flex-col items-center justify-center gap-4">
						<div
							class="flex items-center justify-center rounded-full text-4xl font-semibold text-white size-20"
							style="background-color: {avatarColor}"
						>
							{initials}
						</div>
						{#if isEditing}
							<div class="w-full space-y-4">
								<div class="grid gap-2">
									<Label for="edit-name">Nombre completo</Label>
									<Input
										id="edit-name"
										bind:value={editName}
										placeholder="Juan García"
										disabled={submitting}
									/>
								</div>
								<div class="grid gap-2">
									<Label for="edit-email">Email</Label>
									<Input
										id="edit-email"
										type="email"
										bind:value={editEmail}
										placeholder="usuario@email.com"
										disabled={submitting}
									/>
								</div>
								{#if error}
									<div class="text-sm text-destructive text-center">{error}</div>
								{/if}
								<div class="flex justify-center gap-2">
									<Button variant="outline" size="sm" onclick={cancelEditing} disabled={submitting}>
										Cancelar
									</Button>
									<Button size="sm" onclick={handleSave} disabled={submitting}>
										{#if submitting}
											<span class="material-symbols-rounded animate-spin text-lg!"
												>progress_activity</span
											>
										{/if}
										Guardar
									</Button>
								</div>
							</div>
						{:else}
							<div class="text-center">
								<CardTitle class="text-2xl font-semibold tracking-tight">{user?.name ?? ''}</CardTitle
								>
								<CardDescription class="mt-1">{user?.email ?? ''}</CardDescription>
							</div>
							<Button variant="outline" size="sm" onclick={startEditing}>
								<span class="material-symbols-rounded text-lg!">edit</span>
								Editar perfil
							</Button>
						{/if}
					</div>
				</CardHeader>

				<Separator />

				<CardContent class="space-y-4">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium">Contraseña</p>
							<p class="text-sm text-muted-foreground">
								Restablece tu contraseña por correo electrónico
							</p>
						</div>
						<Button href={resolve('/reset-password')} variant="outline" size="sm">Restablecer</Button>
					</div>
				</CardContent>
			</Card>

			<!-- Right Column: Schedule -->
			<Card class="h-fit">
				<CardHeader>
					<CardTitle class="text-lg font-semibold tracking-tight flex items-center gap-2">
						<span class="material-symbols-rounded text-xl!">schedule</span>
						Mi Horario de Trabajo
					</CardTitle>
					<CardDescription>
						{#if loadingCompany}
							<Skeleton class="h-4 w-48" />
						{:else if canEditSchedule}
							Personaliza tu horario de trabajo semanal
						{:else}
							Tu empresa no permite personalizar horarios
						{/if}
					</CardDescription>
				</CardHeader>

				<CardContent>
					{#if loadingSchedule || loadingCompany}
						<div class="space-y-3">
							{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
								<Skeleton class="h-10 w-full" />
							{/each}
						</div>
					{:else if scheduleError && mySchedule.length === 0}
						<div class="flex flex-col items-center justify-center py-6 text-destructive">
							<span class="material-symbols-rounded text-3xl! mb-2">error</span>
							<p class="text-sm">{scheduleError}</p>
							<Button variant="outline" size="sm" class="mt-3" onclick={loadSchedule}>
								<span class="material-symbols-rounded text-lg! mr-1">refresh</span>
								Reintentar
							</Button>
						</div>
					{:else if canEditSchedule}
						<!-- Editable schedule -->
						<div class="space-y-4">
							<ScheduleEditor
								bind:schedule={mySchedule}
								disabled={savingSchedule || deletingOverrides}
							/>

							{#if scheduleError}
								<div class="text-sm text-destructive flex items-center gap-1">
									<span class="material-symbols-rounded text-base">error</span>
									{scheduleError}
								</div>
							{/if}

							<div class="flex justify-between gap-2">
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger>
											<Button
												variant="outline"
												size="sm"
												onclick={handleResetSchedule}
												disabled={savingSchedule || deletingOverrides}
											>
												{#if deletingOverrides}
													<span class="material-symbols-rounded animate-spin text-lg!"
														>progress_activity</span
													>
												{:else}
													<span class="material-symbols-rounded text-lg! mr-1">restart_alt</span>
												{/if}
												Restablecer
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>Usar el horario por defecto de la empresa</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>

								<Button
									size="sm"
									onclick={handleSaveSchedule}
									disabled={savingSchedule || deletingOverrides}
								>
									{#if savingSchedule}
										<span class="material-symbols-rounded animate-spin text-lg!"
											>progress_activity</span
										>
									{:else}
										<span class="material-symbols-rounded text-lg! mr-1">save</span>
									{/if}
									Guardar
								</Button>
							</div>
						</div>
					{:else}
						<!-- Read-only schedule view -->
						<div class="space-y-3">
							{#each Array.from({ length: 7 }, (_, i) => i) as dayIndex (dayIndex)}
								{@const daySchedule = mySchedule.find((d) => d.dayOfWeek === dayIndex)}
								<div
									class="flex items-center justify-between p-3 border rounded-lg {daySchedule
										? 'bg-background'
										: 'bg-muted/30'}"
								>
									<span class="font-medium {!daySchedule ? 'text-muted-foreground' : ''}">
										{DAY_NAMES[dayIndex]}
									</span>
									{#if daySchedule}
										<span class="text-sm">
											{daySchedule.startTime} – {daySchedule.endTime}
										</span>
									{:else}
										<span class="text-sm text-muted-foreground italic">No laborable</span>
									{/if}
								</div>
							{/each}
							<p class="text-xs text-muted-foreground text-center mt-4">
								Contacta con un administrador para modificar tu horario
							</p>
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>
	</div>
</div>

<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		auth,
		profiles as profilesStore,
		activeProfile as activeProfileStore,
		isGuest as isGuestStore,
		type AuthUser,
		type Profile
	} from '$lib/stores/auth';
	import { updateProfile, setActiveProfileId, switchProfile } from '$lib/auth';
	import { stringToColor, getInitials } from '$lib/utils';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent,
		CardAction
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';
	import ScheduleEditor from '../admin/ScheduleEditor.svelte';
	import AddCompanyModal from '$lib/components/AddCompanyModal.svelte';
	import RelationTypeBadge from '$lib/components/RelationTypeBadge.svelte';
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
	let profiles = $state<Profile[]>([]);
	let activeProfile = $state<Profile | null>(null);
	let isGuest = $state(false);

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

	// Add company modal state
	let addCompanyModalOpen = $state(false);
	let switchingProfileId = $state<string | null>(null);

	const canEditSchedule = $derived(company?.allowUserEditSchedule ?? false);

	const roleLabels: Record<string, string> = {
		OWNER: 'Propietario',
		ADMIN: 'Administrador',
		WORKER: 'Trabajador',
		AUDITOR: 'Auditor'
	};

	$effect(() => {
		const unsubscribe = auth.subscribe((state) => {
			user = state.user;
		});
		return unsubscribe;
	});

	$effect(() => {
		const unsubscribe = profilesStore.subscribe((value) => {
			profiles = value;
		});
		return unsubscribe;
	});

	$effect(() => {
		const unsubscribe = activeProfileStore.subscribe((value) => {
			activeProfile = value;
		});
		return unsubscribe;
	});

	$effect(() => {
		const unsubscribe = isGuestStore.subscribe((value) => {
			isGuest = value;
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

	async function handleSwitchProfile(profile: Profile) {
		if (profile.id === activeProfile?.id || switchingProfileId) return;

		switchingProfileId = profile.id;
		try {
			await switchProfile(profile.id);
			setActiveProfileId(profile.id);
			auth.setActiveProfile(profile);
			// Reload to apply new profile (layout guards will handle redirects if needed)
			window.location.reload();
		} catch (e) {
			console.error('Failed to switch profile:', e);
		} finally {
			switchingProfileId = null;
		}
	}

	onMount(() => {
		// Only load schedule-related data for non-GUEST users
		if (!isGuest) {
			loadCompany();
			loadSchedule();
		}
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
			<div class="space-y-6">
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
										<Button
											variant="outline"
											size="sm"
											onclick={cancelEditing}
											disabled={submitting}
										>
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
									<CardTitle class="text-2xl font-semibold tracking-tight"
										>{user?.name ?? ''}</CardTitle
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
							<Button href={resolve('/reset-password')} variant="outline" size="sm"
								>Restablecer</Button
							>
						</div>
					</CardContent>
				</Card>

				<!-- My Companies Card -->
				<Card class="h-fit">
					<CardHeader>
						<CardTitle class="text-lg font-semibold tracking-tight flex items-center gap-2">
							<span class="material-symbols-rounded text-xl!">business</span>
							Mis Empresas
						</CardTitle>
						<CardAction>
							<Button size="sm" onclick={() => (addCompanyModalOpen = true)}>
								<span class="material-symbols-rounded text-lg!">add</span>
								Añadir
							</Button>
						</CardAction>
						<CardDescription>
							Empresas a las que tienes acceso. Haz clic para cambiar.
						</CardDescription>
					</CardHeader>

					<CardContent>
						{#if profiles.length === 0}
							<div class="text-center py-6 text-muted-foreground">
								<span class="material-symbols-rounded text-3xl! mb-2">business</span>
								<p class="text-sm">No tienes empresas asociadas</p>
							</div>
						{:else}
							<div class="space-y-2">
								{#each profiles as profile (profile.id)}
									<Button
										variant="outline"
										class="w-full h-auto flex items-center gap-3 p-3 justify-start text-left
											{activeProfile?.id === profile.id ? 'border-primary bg-primary/5 hover:bg-primary/10' : ''}"
										onclick={() => handleSwitchProfile(profile)}
										disabled={switchingProfileId !== null}
									>
										<!-- Company Logo or Initial -->
										<div
											class="flex items-center justify-center w-10 h-10 rounded-md bg-muted text-sm font-semibold shrink-0"
										>
											{#if profile.company.logoUrl}
												<img
													src={profile.company.logoUrl}
													alt={profile.company.name}
													class="w-full h-full object-cover rounded-md"
												/>
											{:else}
												{profile.company.name.charAt(0).toUpperCase()}
											{/if}
										</div>

										<div class="flex-1 min-w-0">
											<div class="font-medium text-sm truncate">{profile.company.name}</div>
											<div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
												<span class="text-xs text-muted-foreground">
													{roleLabels[profile.role] ?? profile.role}
												</span>
												<RelationTypeBadge
													type={profile.relation}
													class="text-[10px] px-1.5 py-0"
												/>
											</div>
										</div>

										{#if switchingProfileId === profile.id}
											<span
												class="material-symbols-rounded animate-spin text-lg text-muted-foreground"
												>progress_activity</span
											>
										{:else if activeProfile?.id === profile.id}
											<Badge variant="secondary" class="text-xs">Activa</Badge>
										{/if}
									</Button>
								{/each}
							</div>
						{/if}
					</CardContent>
				</Card>
			</div>

			<!-- Right Column: Schedule (hidden for GUEST users) -->
			{#if !isGuest}
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
									{@const hasBreak = !!(daySchedule?.breakStartTime && daySchedule?.breakEndTime)}
									<div
										class="flex items-center justify-between p-3 border rounded-lg {daySchedule
											? 'bg-background'
											: 'bg-muted/30'}"
									>
										<span class="font-medium {!daySchedule ? 'text-muted-foreground' : ''}">
											{DAY_NAMES[dayIndex]}
										</span>
										{#if daySchedule}
											<div class="flex flex-col items-end gap-0.5">
												<span class="text-sm">
													{daySchedule.startTime} – {daySchedule.endTime}
												</span>
												{#if hasBreak}
													<span class="text-xs text-muted-foreground">
														descanso: {daySchedule.breakStartTime} – {daySchedule.breakEndTime}
													</span>
												{/if}
											</div>
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
			{/if}
		</div>
	</div>
</div>

<AddCompanyModal bind:open={addCompanyModalOpen} />

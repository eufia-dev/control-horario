<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import {
		createProject,
		updateProject,
		type Project,
		type CreateProjectDto,
		type UpdateProjectDto
	} from '$lib/api/projects';
	import { fetchTeams, type Team } from '$lib/api/teams';
	import { fetchProjectCategories, type ProjectCategory } from '$lib/api/project-categories';
	import {
		isAdmin as isAdminStore,
		userTeamId as userTeamIdStore,
		hasCostsFeature as hasCostsFeatureStore
	} from '$lib/stores/auth';

	type Props = {
		open: boolean;
		project?: Project | null;
		onClose: () => void;
		onSuccess: () => void;
	};

	let { open = $bindable(), project = null, onClose, onSuccess }: Props = $props();

	let name = $state('');
	let code = $state('');
	let isActive = $state(true);
	let teamId = $state<string>('');
	let categoryId = $state<string>('');
	let delegation = $state('');
	let clientName = $state('');
	let teams = $state<Team[]>([]);
	let categories = $state<ProjectCategory[]>([]);
	let loadingTeams = $state(false);
	let loadingCategories = $state(false);
	let submitting = $state(false);
	let success = $state(false);
	let error = $state<string | null>(null);
	let isAdmin = $state(false);
	let currentUserTeamId = $state<string | null>(null);
	let hasCostsFeature = $state(false);

	$effect(() => {
		const unsub = isAdminStore.subscribe((value) => {
			isAdmin = value;
		});
		return unsub;
	});

	$effect(() => {
		const unsub = userTeamIdStore.subscribe((value) => {
			currentUserTeamId = value;
		});
		return unsub;
	});

	$effect(() => {
		const unsub = hasCostsFeatureStore.subscribe((value) => {
			hasCostsFeature = value;
		});
		return unsub;
	});

	const isEditMode = $derived(project !== null && project !== undefined);
	const dialogTitle = $derived(isEditMode ? 'Editar Proyecto' : 'Nuevo Proyecto');
	const dialogDescription = $derived(
		isEditMode
			? 'Modifica los datos del proyecto.'
			: 'Rellena los datos para crear un nuevo proyecto.'
	);

	const selectedTeamLabel = $derived(
		teamId === ''
			? 'Global (sin equipo)'
			: (teams.find((t) => t.id === teamId)?.name ?? 'Global (sin equipo)')
	);

	const selectedCategoryLabel = $derived(
		categoryId === ''
			? 'Sin categoría'
			: (categories.find((c) => c.id === categoryId)?.name ?? 'Sin categoría')
	);

	function resetForm() {
		name = '';
		code = '';
		isActive = true;
		teamId = '';
		categoryId = '';
		delegation = '';
		clientName = '';
		error = null;
		success = false;
	}

	function populateForm() {
		if (project) {
			name = project.name;
			code = project.code;
			isActive = project.isActive;
			teamId = project.teamId ?? '';
			categoryId = project.categoryId ?? '';
			delegation = project.delegation ?? '';
			clientName = project.clientName ?? '';
		} else {
			resetForm();
			// For team leaders, auto-select their team
			if (!isAdmin && currentUserTeamId) {
				teamId = currentUserTeamId;
			}
		}
	}

	async function loadTeams() {
		loadingTeams = true;
		try {
			teams = await fetchTeams();
		} catch (e) {
			console.error('Error loading teams:', e);
		} finally {
			loadingTeams = false;
		}
	}

	async function loadCategories() {
		loadingCategories = true;
		try {
			categories = await fetchProjectCategories();
		} catch (e) {
			console.error('Error loading categories:', e);
		} finally {
			loadingCategories = false;
		}
	}

	$effect(() => {
		if (open) {
			populateForm();
			loadCategories();
			if (isAdmin) {
				loadTeams();
			}
		}
	});

	$effect(() => {
		if (!open) {
			resetForm();
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (submitting || success) return;
		error = null;

		if (!name.trim()) {
			error = 'El nombre es obligatorio';
			return;
		}

		if (!code.trim()) {
			error = 'El código es obligatorio';
			return;
		}

		submitting = true;

		try {
			if (isEditMode && project) {
				const data: UpdateProjectDto = {
					name: name.trim(),
					code: code.trim(),
					isActive,
					// Admin can change team, team leader keeps existing team
					teamId: isAdmin ? teamId || null : undefined,
					categoryId: categoryId || null,
					delegation: delegation.trim() || null,
					clientName: clientName.trim() || null
				};
				await updateProject(project.id, data);
			} else {
				// For team leaders, use their team ID; for admins, use selected team
				const effectiveTeamId = isAdmin ? teamId || undefined : currentUserTeamId || undefined;
				const data: CreateProjectDto = {
					name: name.trim(),
					code: code.trim(),
					teamId: effectiveTeamId,
					categoryId: categoryId || undefined,
					delegation: delegation.trim() || undefined,
					clientName: clientName.trim() || undefined
				};
				await createProject(data);
			}
			submitting = false;
			success = true;
			onSuccess();
			// Small delay to show success animation before closing
			setTimeout(() => {
				open = false;
				onClose();
			}, 800);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al guardar el proyecto';
			submitting = false;
		}
	}

	function handleClose() {
		open = false;
		onClose();
	}
</script>

<Dialog bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>{dialogTitle}</DialogTitle>
			<DialogDescription>{dialogDescription}</DialogDescription>
		</DialogHeader>

		<form onsubmit={handleSubmit} class="grid gap-4 py-4">
			<div class="grid gap-2">
				<Label for="code">Código</Label>
				<Input id="code" bind:value={code} placeholder="ABC-001" disabled={submitting} />
			</div>

			<div class="grid gap-2">
				<Label for="name">Nombre</Label>
				<Input
					id="name"
					bind:value={name}
					placeholder="Nombre del proyecto"
					disabled={submitting}
				/>
			</div>

			{#if hasCostsFeature}
				<div class="grid gap-2">
					<Label for="delegation">Delegación</Label>
					<Input
						id="delegation"
						bind:value={delegation}
						placeholder="Delegación (opcional)"
						disabled={submitting}
						maxlength={100}
					/>
				</div>

				<div class="grid gap-2">
					<Label for="clientName">Cliente</Label>
					<Input
						id="clientName"
						bind:value={clientName}
						placeholder="Nombre del cliente (opcional)"
						disabled={submitting}
						maxlength={255}
					/>
				</div>
			{/if}

			<div class="grid gap-2">
				<Label>Categoría</Label>
				<Select type="single" bind:value={categoryId} disabled={submitting || loadingCategories}>
					<SelectTrigger class="w-full">
						{selectedCategoryLabel}
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="" label="Sin categoría" />
						{#each categories as category (category.id)}
							<SelectItem value={category.id} label={category.name} />
						{/each}
					</SelectContent>
				</Select>
			</div>

			{#if isAdmin}
				<div class="grid gap-2">
					<Label>Equipo</Label>
					<Select type="single" bind:value={teamId} disabled={submitting || loadingTeams}>
						<SelectTrigger class="w-full">
							{selectedTeamLabel}
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="" label="Global (sin equipo)" />
							{#each teams as team (team.id)}
								<SelectItem value={team.id} label={team.name} />
							{/each}
						</SelectContent>
					</Select>
					<p class="text-xs text-muted-foreground">
						Los proyectos globales pueden ser editados solo por administradores
					</p>
				</div>
			{:else if !isEditMode}
				<div class="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
					<span class="material-symbols-rounded text-sm! align-middle mr-1">info</span>
					Este proyecto se asignará automáticamente a tu equipo
				</div>
			{/if}

			{#if isEditMode}
				<div class="flex items-center gap-3">
					<Switch id="isActive" bind:checked={isActive} disabled={submitting} />
					<Label for="isActive" class="cursor-pointer">Proyecto activo</Label>
				</div>
			{/if}

			{#if error}
				<div class="text-sm text-destructive">{error}</div>
			{/if}

			<DialogFooter class="gap-2">
				<Button
					type="button"
					variant="outline"
					onclick={handleClose}
					disabled={submitting || success}
				>
					Cancelar
				</Button>
				<Button
					type="submit"
					variant={success ? 'success' : 'default'}
					disabled={submitting || success}
					class="min-w-22"
				>
					{#if submitting}
						<span class="material-symbols-rounded animate-spin text-lg!">progress_activity</span>
					{:else if success}
						<span class="material-symbols-rounded text-lg! animate-in zoom-in duration-200"
							>check_circle</span
						>
						Guardado
					{:else}
						Guardar
					{/if}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

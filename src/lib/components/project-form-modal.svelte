<script lang="ts">
	import { onMount } from 'svelte';
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
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger
	} from '$lib/components/ui/select';
	import {
		createProject,
		updateProject,
		fetchCompanies,
		type Project,
		type Company,
		type CreateProjectDto,
		type UpdateProjectDto
	} from '$lib/api/projects';

	type Props = {
		open: boolean;
		project?: Project | null;
		onClose: () => void;
		onSuccess: () => void;
	};

	let { open = $bindable(), project = null, onClose, onSuccess }: Props = $props();

	let name = $state('');
	let code = $state('');
	let companyId = $state<string | undefined>(undefined);
	let isActive = $state(true);
	let companies = $state<Company[]>([]);
	let loadingCompanies = $state(true);
	let submitting = $state(false);
	let error = $state<string | null>(null);

	const isEditMode = $derived(project !== null && project !== undefined);
	const dialogTitle = $derived(isEditMode ? 'Editar Proyecto' : 'Nuevo Proyecto');
	const dialogDescription = $derived(
		isEditMode
			? 'Modifica los datos del proyecto.'
			: 'Rellena los datos para crear un nuevo proyecto.'
	);
	const submitLabel = $derived(isEditMode ? 'Guardar cambios' : 'Crear proyecto');

	const selectedCompany = $derived(companies.find((c) => c.id === companyId));
	const hasSingleCompany = $derived(companies.length === 1);

	async function loadCompanies() {
		loadingCompanies = true;
		try {
			companies = await fetchCompanies();
		} catch (e) {
			console.error('Error loading companies:', e);
		} finally {
			loadingCompanies = false;
		}
	}

	function resetForm() {
		name = '';
		code = '';
		companyId = undefined;
		isActive = true;
		error = null;
	}

	function populateForm() {
		if (project) {
			name = project.name;
			code = project.code;
			isActive = project.isActive;
			const company = companies.find((c) => c.name === project.companyName);
			companyId = company?.id;
		} else {
			resetForm();
			// Auto-select first company when creating new project
			if (companies.length > 0) {
				companyId = companies[0].id;
			}
		}
	}

	$effect(() => {
		if (open) {
			loadCompanies();
		}
	});

	$effect(() => {
		if (open && companies.length > 0) {
			populateForm();
		}
	});

	$effect(() => {
		if (!open) {
			resetForm();
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;

		if (!name.trim()) {
			error = 'El nombre es obligatorio';
			return;
		}

		if (!code.trim()) {
			error = 'El código es obligatorio';
			return;
		}

		if (!companyId) {
			error = 'Debes seleccionar una empresa';
			return;
		}

		submitting = true;

		try {
			if (isEditMode && project) {
				const data: UpdateProjectDto = {
					name: name.trim(),
					code: code.trim(),
					companyId,
					isActive
				};
				await updateProject(project.id, data);
			} else {
				const data: CreateProjectDto = {
					name: name.trim(),
					code: code.trim(),
					companyId
				};
				await createProject(data);
			}
			onSuccess();
			handleClose();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al guardar el proyecto';
		} finally {
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
				<Input id="name" bind:value={name} placeholder="Nombre del proyecto" disabled={submitting} />
			</div>

			{#if !hasSingleCompany}
				<div class="grid gap-2">
					<Label>Empresa</Label>
					<Select
						type="single"
						bind:value={companyId}
						disabled={submitting || loadingCompanies}
					>
						<SelectTrigger class="w-full">
							{#if loadingCompanies}
								<span class="text-muted-foreground">Cargando empresas...</span>
							{:else if selectedCompany}
								{selectedCompany.name}
							{:else}
								<span class="text-muted-foreground">Seleccionar empresa</span>
							{/if}
						</SelectTrigger>
						<SelectContent>
							{#each companies as company (company.id)}
								<SelectItem value={company.id} label={company.name} />
							{/each}
						</SelectContent>
					</Select>
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
				<Button type="button" variant="outline" onclick={handleClose} disabled={submitting}>
					Cancelar
				</Button>
				<Button type="submit" disabled={submitting}>
					{#if submitting}
						<span class="material-symbols-rounded mr-2 animate-spin text-base">progress_activity</span>
					{/if}
					{submitLabel}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>


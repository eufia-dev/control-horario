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
	import {
		createProject,
		updateProject,
		type Project,
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
	let isActive = $state(true);
	let submitting = $state(false);
	let success = $state(false);
	let error = $state<string | null>(null);

	const isEditMode = $derived(project !== null && project !== undefined);
	const dialogTitle = $derived(isEditMode ? 'Editar Proyecto' : 'Nuevo Proyecto');
	const dialogDescription = $derived(
		isEditMode
			? 'Modifica los datos del proyecto.'
			: 'Rellena los datos para crear un nuevo proyecto.'
	);

	function resetForm() {
		name = '';
		code = '';
		isActive = true;
		error = null;
		success = false;
	}

	function populateForm() {
		if (project) {
			name = project.name;
			code = project.code;
			isActive = project.isActive;
		} else {
			resetForm();
		}
	}

	$effect(() => {
		if (open) {
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
					isActive
				};
				await updateProject(project.id, data);
			} else {
				const data: CreateProjectDto = {
					name: name.trim(),
					code: code.trim()
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

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
	import {
		createProjectCategory,
		updateProjectCategory,
		type ProjectCategory,
		type CreateProjectCategoryDto,
		type UpdateProjectCategoryDto
	} from '$lib/api/project-categories';

	type Props = {
		open: boolean;
		category?: ProjectCategory | null;
		onClose: () => void;
		onSuccess: () => void;
	};

	let { open = $bindable(), category = null, onClose, onSuccess }: Props = $props();

	let name = $state('');
	let submitting = $state(false);
	let success = $state(false);
	let error = $state<string | null>(null);

	const isEditMode = $derived(category !== null && category !== undefined);
	const dialogTitle = $derived(isEditMode ? 'Editar Categoría' : 'Nueva Categoría');
	const dialogDescription = $derived(
		isEditMode
			? 'Modifica los datos de la categoría.'
			: 'Añade una nueva categoría para organizar tus proyectos.'
	);

	function resetForm() {
		name = '';
		error = null;
		success = false;
	}

	function populateForm() {
		if (category) {
			name = category.name;
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

		submitting = true;

		try {
			if (isEditMode && category) {
				const data: UpdateProjectCategoryDto = {
					name: name.trim()
				};
				await updateProjectCategory(category.id, data);
			} else {
				const data: CreateProjectCategoryDto = {
					name: name.trim()
				};
				await createProjectCategory(data);
			}
			submitting = false;
			success = true;
			onSuccess();
			setTimeout(() => {
				open = false;
				onClose();
			}, 800);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al guardar la categoría';
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
				<Label for="name">Nombre *</Label>
				<Input
					id="name"
					bind:value={name}
					placeholder="Nombre de la categoría"
					disabled={submitting}
					maxlength={100}
				/>
			</div>

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

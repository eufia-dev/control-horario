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
		createExternal,
		updateExternal,
		type External,
		type CreateExternalDto,
		type UpdateExternalDto
	} from '$lib/api/externals';

	type Props = {
		open: boolean;
		external?: External | null;
		onClose: () => void;
		onSuccess: () => void;
	};

	let { open = $bindable(), external = null, onClose, onSuccess }: Props = $props();

	let name = $state('');
	let hourlyCost = $state(0);
	let isActive = $state(true);
	let submitting = $state(false);
	let success = $state(false);
	let error = $state<string | null>(null);

	const isEditMode = $derived(external !== null && external !== undefined);
	const dialogTitle = $derived(isEditMode ? 'Editar Externo' : 'Nuevo Externo');
	const dialogDescription = $derived(
		isEditMode
			? 'Modifica los datos del externo.'
			: 'Rellena los datos para crear un nuevo externo.'
	);
	const submitLabel = $derived(isEditMode ? 'Guardar cambios' : 'Crear externo');

	function resetForm() {
		name = '';
		hourlyCost = 0;
		isActive = true;
		error = null;
		success = false;
	}

	function populateForm() {
		if (external) {
			name = external.name;
			hourlyCost = external.hourlyCost;
			isActive = external.isActive;
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

		if (hourlyCost < 0) {
			error = 'El coste por hora debe ser mayor o igual a 0';
			return;
		}

		submitting = true;

		try {
			if (isEditMode && external) {
				const data: UpdateExternalDto = {
					name: name.trim(),
					hourlyCost,
					isActive
				};
				await updateExternal(external.id, data);
			} else {
				const data: CreateExternalDto = {
					name: name.trim(),
					hourlyCost
				};
				await createExternal(data);
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
			error = e instanceof Error ? e.message : 'Error al guardar el externo';
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
				<Label for="name">Nombre</Label>
				<Input id="name" bind:value={name} placeholder="Nombre del externo" disabled={submitting} />
			</div>

			<div class="grid gap-2">
				<Label for="hourlyCost">Coste por hora (€)</Label>
				<Input
					id="hourlyCost"
					type="number"
					min="0"
					step="0.01"
					bind:value={hourlyCost}
					disabled={submitting}
				/>
			</div>

			{#if isEditMode}
				<div class="flex items-center gap-3">
					<Switch id="isActive" bind:checked={isActive} disabled={submitting} />
					<Label for="isActive" class="cursor-pointer">Externo activo</Label>
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
					class="min-w-[120px] transition-all duration-300"
				>
					{#if submitting}
						<span class="material-symbols-rounded animate-spin text-base">progress_activity</span>
						{submitLabel}
					{:else if success}
						<span class="material-symbols-rounded text-base animate-in zoom-in duration-200"
							>check_circle</span
						>
						Guardado
					{:else}
						{submitLabel}
					{/if}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

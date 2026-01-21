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
		createProvider,
		updateProvider,
		type Provider,
		type CreateProviderDto,
		type UpdateProviderDto
	} from '$lib/api/providers';

	type Props = {
		open: boolean;
		provider?: Provider | null;
		onClose: () => void;
		onSuccess: () => void;
	};

	let { open = $bindable(), provider = null, onClose, onSuccess }: Props = $props();

	let name = $state('');
	let paymentPeriod = $state<number | null>(30);
	let submitting = $state(false);
	let success = $state(false);
	let error = $state<string | null>(null);

	const isEditMode = $derived(provider !== null && provider !== undefined);
	const dialogTitle = $derived(isEditMode ? 'Editar Proveedor' : 'Nuevo Proveedor');
	const dialogDescription = $derived(
		isEditMode
			? 'Modifica los datos del proveedor.'
			: 'Añade un nuevo proveedor para asignar a los costes externos.'
	);

	function resetForm() {
		name = '';
		paymentPeriod = 30;
		error = null;
		success = false;
	}

	function populateForm() {
		if (provider) {
			name = provider.name;
			paymentPeriod = provider.paymentPeriod;
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

		if (paymentPeriod === null || paymentPeriod < 0) {
			error = 'El periodo de pago debe ser un número positivo';
			return;
		}

		submitting = true;

		try {
			if (isEditMode && provider) {
				const data: UpdateProviderDto = {
					name: name.trim(),
					paymentPeriod
				};
				await updateProvider(provider.id, data);
			} else {
				const data: CreateProviderDto = {
					name: name.trim(),
					paymentPeriod
				};
				await createProvider(data);
			}
			submitting = false;
			success = true;
			onSuccess();
			setTimeout(() => {
				open = false;
				onClose();
			}, 800);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al guardar el proveedor';
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
					placeholder="Nombre del proveedor"
					disabled={submitting}
					maxlength={255}
				/>
			</div>

			<div class="grid gap-2">
				<Label for="paymentPeriod">Periodo de Pago (días) *</Label>
				<Input
					id="paymentPeriod"
					type="number"
					min="0"
					step="1"
					bind:value={paymentPeriod}
					placeholder="30"
					disabled={submitting}
				/>
				<p class="text-xs text-muted-foreground">
					Días desde la emisión de factura hasta el vencimiento del pago
				</p>
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

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
	import { Textarea } from '$lib/components/ui/textarea';
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
	let fiscalName = $state('');
	let cif = $state('');
	let phone = $state('');
	let email = $state('');
	let notes = $state('');
	let type = $state('');
	let location = $state('');
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
		fiscalName = '';
		cif = '';
		phone = '';
		email = '';
		notes = '';
		type = '';
		location = '';
		error = null;
		success = false;
	}

	function populateForm() {
		if (provider) {
			name = provider.name;
			paymentPeriod = provider.paymentPeriod;
			fiscalName = provider.fiscalName ?? '';
			cif = provider.cif ?? '';
			phone = provider.phone ?? '';
			email = provider.email ?? '';
			notes = provider.notes ?? '';
			type = provider.type ?? '';
			location = provider.location ?? '';
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

	function isValidEmail(value: string): boolean {
		if (!value) return true;
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(value);
	}

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

		if (email.trim() && !isValidEmail(email.trim())) {
			error = 'El email no tiene un formato válido';
			return;
		}

		submitting = true;

		try {
			if (isEditMode && provider) {
				const data: UpdateProviderDto = {
					name: name.trim(),
					paymentPeriod,
					fiscalName: fiscalName.trim() || undefined,
					cif: cif.trim() || undefined,
					phone: phone.trim() || undefined,
					email: email.trim() || undefined,
					notes: notes.trim() || undefined,
					type: type.trim() || undefined,
					location: location.trim() || undefined
				};
				await updateProvider(provider.id, data);
			} else {
				const data: CreateProviderDto = {
					name: name.trim(),
					paymentPeriod,
					fiscalName: fiscalName.trim() || undefined,
					cif: cif.trim() || undefined,
					phone: phone.trim() || undefined,
					email: email.trim() || undefined,
					notes: notes.trim() || undefined,
					type: type.trim() || undefined,
					location: location.trim() || undefined
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
	<DialogContent class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
		<DialogHeader>
			<DialogTitle>{dialogTitle}</DialogTitle>
			<DialogDescription>{dialogDescription}</DialogDescription>
		</DialogHeader>

		<form onsubmit={handleSubmit} class="grid gap-4 py-4">
			<!-- Datos principales -->
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
					<Label for="type">Tipo</Label>
					<Input
						id="type"
						bind:value={type}
						placeholder="Ej: Software, Servicios, Hardware..."
						disabled={submitting}
						maxlength={100}
					/>
				</div>
			</div>

			<!-- Datos fiscales -->
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label for="fiscalName">Nombre Fiscal</Label>
					<Input
						id="fiscalName"
						bind:value={fiscalName}
						placeholder="Razón social"
						disabled={submitting}
						maxlength={255}
					/>
				</div>

				<div class="grid gap-2">
					<Label for="cif">CIF/NIF</Label>
					<Input
						id="cif"
						bind:value={cif}
						placeholder="B12345678"
						disabled={submitting}
						maxlength={50}
					/>
				</div>
			</div>

			<!-- Contacto -->
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label for="phone">Teléfono</Label>
					<Input
						id="phone"
						type="tel"
						bind:value={phone}
						placeholder="+34 123 456 789"
						disabled={submitting}
						maxlength={50}
					/>
				</div>

				<div class="grid gap-2">
					<Label for="email">Email</Label>
					<Input
						id="email"
						type="email"
						bind:value={email}
						placeholder="contacto@proveedor.com"
						disabled={submitting}
						maxlength={320}
					/>
				</div>
			</div>

			<!-- Ubicación -->
			<div class="grid gap-2">
				<Label for="location">Ubicación</Label>
				<Input
					id="location"
					bind:value={location}
					placeholder="Dirección completa"
					disabled={submitting}
					maxlength={500}
				/>
			</div>

			<!-- Pago -->
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
					class="max-w-[200px]"
				/>
				<p class="text-xs text-muted-foreground">
					Días desde la emisión de factura hasta el vencimiento del pago
				</p>
			</div>

			<!-- Notas -->
			<div class="grid gap-2">
				<Label for="notes">Notas</Label>
				<Textarea
					id="notes"
					bind:value={notes}
					placeholder="Información adicional sobre el proveedor..."
					disabled={submitting}
					rows={3}
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

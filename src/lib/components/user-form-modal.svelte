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
	import { updateUser, type User, type UpdateUserDto } from '$lib/api/users';

	type Props = {
		open: boolean;
		user: User | null;
		onClose: () => void;
		onSuccess: () => void;
	};

	let { open = $bindable(), user = null, onClose, onSuccess }: Props = $props();

	let name = $state('');
	let email = $state('');
	let hourlyCost = $state(0);
	let isActive = $state(true);
	let isAdmin = $state(false);
	let submitting = $state(false);
	let error = $state<string | null>(null);

	function resetForm() {
		name = '';
		email = '';
		hourlyCost = 0;
		isActive = true;
		isAdmin = false;
		error = null;
	}

	function populateForm() {
		if (user) {
			name = user.name;
			email = user.email;
			hourlyCost = user.hourlyCost;
			isActive = user.isActive;
			isAdmin = user.isAdmin;
		} else {
			resetForm();
		}
	}

	$effect(() => {
		if (open && user) {
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

		if (!email.trim()) {
			error = 'El email es obligatorio';
			return;
		}

		// Basic email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email.trim())) {
			error = 'El formato del email no es válido';
			return;
		}

		if (hourlyCost < 0) {
			error = 'El coste por hora debe ser mayor o igual a 0';
			return;
		}

		if (!user) {
			error = 'No se ha seleccionado ningún usuario';
			return;
		}

		submitting = true;

		try {
			const data: UpdateUserDto = {
				name: name.trim(),
				email: email.trim(),
				hourlyCost,
				isActive,
				isAdmin
			};
			await updateUser(user.id, data);
			onSuccess();
			handleClose();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al guardar el usuario';
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
			<DialogTitle>Editar Usuario</DialogTitle>
			<DialogDescription>Modifica los datos del usuario.</DialogDescription>
		</DialogHeader>

		<form onsubmit={handleSubmit} class="grid gap-4 py-4">
			<div class="grid gap-2">
				<Label for="name">Nombre</Label>
				<Input id="name" bind:value={name} placeholder="Nombre del usuario" disabled={submitting} />
			</div>

			<div class="grid gap-2">
				<Label for="email">Email</Label>
				<Input
					id="email"
					type="email"
					bind:value={email}
					placeholder="usuario@ejemplo.com"
					disabled={submitting}
				/>
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

			<div class="flex items-center gap-3">
				<Switch id="isActive" bind:checked={isActive} disabled={submitting} />
				<Label for="isActive" class="cursor-pointer">Usuario activo</Label>
			</div>

			<div class="flex items-center gap-3">
				<Switch id="isAdmin" bind:checked={isAdmin} disabled={submitting} />
				<Label for="isAdmin" class="cursor-pointer">Administrador</Label>
			</div>

			{#if error}
				<div class="text-sm text-destructive">{error}</div>
			{/if}

			<DialogFooter class="gap-2">
				<Button type="button" variant="outline" onclick={handleClose} disabled={submitting}>
					Cancelar
				</Button>
				<Button type="submit" disabled={submitting}>
					{#if submitting}
						<span class="material-symbols-rounded animate-spin text-lg!">progress_activity</span>
					{/if}
					Guardar cambios
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>


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
	import { Badge } from '$lib/components/ui/badge';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { updateUser, type User, type UpdateUserDto } from '$lib/api/users';
	import type { UserRole } from '$lib/stores/auth';
	import type { RelationType } from '$lib/api/invitations';

	type Props = {
		open: boolean;
		user: User | null;
		onClose: () => void;
		onSuccess: () => void;
	};

	let { open = $bindable(), user = null, onClose, onSuccess }: Props = $props();

	let name = $state('');
	let email = $state('');
	let phone = $state('');
	let hourlyCost = $state(0);
	let isActive = $state(true);
	let role = $state<UserRole>('WORKER');
	let relationType = $state<RelationType>('EMPLOYEE');
	let submitting = $state(false);
	let error = $state<string | null>(null);

	const roleOptions: { value: UserRole; label: string }[] = [
		{ value: 'OWNER', label: 'Propietario' },
		{ value: 'ADMIN', label: 'Administrador' },
		{ value: 'WORKER', label: 'Trabajador' },
		{ value: 'AUDITOR', label: 'Auditor' }
	];

	const relationTypeLabels: Record<RelationType, string> = {
		EMPLOYEE: 'Empleado',
		CONTRACTOR: 'Autónomo',
		GUEST: 'Invitado'
	};

	const selectedRoleLabel = $derived(
		roleOptions.find((r) => r.value === role)?.label ?? 'Seleccionar rol'
	);

	function resetForm() {
		name = '';
		email = '';
		phone = '';
		hourlyCost = 0;
		isActive = true;
		role = 'WORKER';
		relationType = 'EMPLOYEE';
		error = null;
	}

	function populateForm() {
		if (user) {
			name = user.name;
			email = user.email;
			phone = user.phone ?? '';
			hourlyCost = user.hourlyCost;
			isActive = user.isActive;
			role = user.role;
			relationType = user.relationType;
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
				phone: phone.trim() || undefined,
				hourlyCost,
				isActive,
				role
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
				<Label for="phone">Teléfono</Label>
				<Input
					id="phone"
					type="tel"
					bind:value={phone}
					placeholder="+34 600 000 000"
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

			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label>Rol</Label>
					<Select type="single" bind:value={role} disabled={submitting}>
						<SelectTrigger class="w-full">
							{selectedRoleLabel}
						</SelectTrigger>
						<SelectContent>
							{#each roleOptions as option (option.value)}
								<SelectItem value={option.value} label={option.label} />
							{/each}
						</SelectContent>
					</Select>
				</div>

				<div class="grid gap-2">
					<Label>Tipo de relación</Label>
					<div class="flex items-center h-10 px-3 border rounded-md bg-muted/50">
						<Badge variant="secondary">{relationTypeLabels[relationType]}</Badge>
					</div>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<Switch id="isActive" bind:checked={isActive} disabled={submitting} />
				<Label for="isActive" class="cursor-pointer">Usuario activo</Label>
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

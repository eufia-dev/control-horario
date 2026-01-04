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
	let relation = $state<RelationType>('EMPLOYEE');
	let submitting = $state(false);
	let success = $state(false);
	let error = $state<string | null>(null);

	const isAuditor = $derived(role === 'AUDITOR');
	const isWorker = $derived(role === 'WORKER');

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

	const selectedRelationTypeLabel = $derived(relationTypeLabels[relation] ?? 'Seleccionar tipo');

	const relationTypeOptions: { value: RelationType; label: string }[] = [
		{ value: 'EMPLOYEE', label: 'Empleado' },
		{ value: 'CONTRACTOR', label: 'Autónomo' },
		{ value: 'GUEST', label: 'Invitado' }
	];

	const availableRelationTypes = $derived(
		isWorker ? relationTypeOptions.filter((r) => r.value !== 'GUEST') : relationTypeOptions
	);

	function resetForm() {
		name = '';
		email = '';
		phone = '';
		hourlyCost = 0;
		isActive = true;
		role = 'WORKER';
		relation = 'EMPLOYEE';
		error = null;
		success = false;
	}

	function populateForm() {
		if (user) {
			name = user.name;
			email = user.email;
			phone = user.phone ?? '';
			hourlyCost = user.hourlyCost;
			isActive = user.isActive;
			role = user.role;
			if (user.role === 'AUDITOR') {
				relation = 'GUEST';
			} else if (user.role === 'WORKER') {
				relation = 'EMPLOYEE';
			} else {
				relation = user.relation;
			}
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

	$effect(() => {
		if (role === 'AUDITOR') {
			relation = 'GUEST';
		} else if (role === 'WORKER') {
			relation = 'EMPLOYEE';
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
				role,
				relation
			};
			await updateUser(user.id, data);
			submitting = false;
			success = true;
			onSuccess();
			// Small delay to show success animation before closing
			setTimeout(() => {
				open = false;
				onClose();
			}, 800);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al guardar el usuario';
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
				<Label for="name">Nombre completo</Label>
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
					<Label>Relación</Label>
					<Select type="single" bind:value={relation} disabled={submitting || isAuditor}>
						<SelectTrigger class="w-full" disabled={submitting || isAuditor}>
							{selectedRelationTypeLabel}
						</SelectTrigger>
						<SelectContent>
							{#each availableRelationTypes as option (option.value)}
								<SelectItem value={option.value} label={option.label} />
							{/each}
						</SelectContent>
					</Select>
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
					class="min-w-[140px] transition-all duration-300"
				>
					{#if submitting}
						<span class="material-symbols-rounded animate-spin text-lg!">progress_activity</span>
						Guardando...
					{:else if success}
						<span class="material-symbols-rounded text-lg! animate-in zoom-in duration-200"
							>check_circle</span
						>
						Guardado
					{:else}
						Guardar cambios
					{/if}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

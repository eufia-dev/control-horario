<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth, type AuthUser } from '$lib/stores/auth';
	import { updateProfile } from '$lib/auth';
	import { stringToColor, getInitials } from '$lib/utils';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let user = $state<AuthUser | null>(null);

	let isEditing = $state(false);
	let editName = $state('');
	let editEmail = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		const unsubscribe = auth.subscribe((state) => {
			user = state.user;
		});
		return unsubscribe;
	});

	const avatarColor = $derived(user?.id ? stringToColor(user.id) : '#6b7280');
	const initials = $derived(user?.name ? getInitials(user.name) : '');

	function startEditing() {
		if (user) {
			editName = user.name;
			editEmail = user.email;
			error = null;
			isEditing = true;
		}
	}

	function cancelEditing() {
		isEditing = false;
		editName = '';
		editEmail = '';
		error = null;
	}

	async function handleSave() {
		error = null;

		if (!editName.trim()) {
			error = 'El nombre es obligatorio';
			return;
		}

		if (!editEmail.trim()) {
			error = 'El email es obligatorio';
			return;
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(editEmail.trim())) {
			error = 'El formato del email no es válido';
			return;
		}

		submitting = true;

		try {
			await updateProfile(editName.trim(), editEmail.trim());
			isEditing = false;
			editName = '';
			editEmail = '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al actualizar el perfil';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="grow flex items-center justify-center bg-background px-4">
	<div class="flex flex-col w-full max-w-md items-start gap-2 -mt-16">
		<Button
			variant="ghost"
			size="sm"
			aria-label="Volver al inicio"
			onclick={() => goto('/')}
			class="text-muted-foreground"
		>
			<span class="material-symbols-rounded text-xl!">arrow_back</span>
			Volver al inicio
		</Button>
		<Card class="w-full">
			<CardHeader class="space-y-4">
				<div class="flex flex-col items-center justify-center gap-4">
					<div
						class="flex items-center justify-center rounded-full text-4xl font-semibold text-white size-20"
						style="background-color: {avatarColor}"
					>
						{initials}
					</div>
					{#if isEditing}
						<div class="w-full space-y-4">
							<div class="grid gap-2">
								<Label for="edit-name">Nombre</Label>
								<Input
									id="edit-name"
									bind:value={editName}
									placeholder="Tu nombre"
									disabled={submitting}
								/>
							</div>
							<div class="grid gap-2">
								<Label for="edit-email">Email</Label>
								<Input
									id="edit-email"
									type="email"
									bind:value={editEmail}
									placeholder="tu@email.com"
									disabled={submitting}
								/>
							</div>
							{#if error}
								<div class="text-sm text-destructive text-center">{error}</div>
							{/if}
							<div class="flex justify-center gap-2">
								<Button variant="outline" size="sm" onclick={cancelEditing} disabled={submitting}>
									Cancelar
								</Button>
								<Button size="sm" onclick={handleSave} disabled={submitting}>
									{#if submitting}
										<span class="material-symbols-rounded animate-spin text-lg!"
											>progress_activity</span
										>
									{/if}
									Guardar
								</Button>
							</div>
						</div>
					{:else}
						<div class="text-center">
							<CardTitle class="text-2xl font-semibold tracking-tight">{user?.name ?? ''}</CardTitle
							>
							<CardDescription class="mt-1">{user?.email ?? ''}</CardDescription>
						</div>
						<Button variant="outline" size="sm" onclick={startEditing}>
							<span class="material-symbols-rounded text-lg!">edit</span>
							Editar perfil
						</Button>
					{/if}
				</div>
			</CardHeader>

			<Separator />

			<CardContent class="space-y-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium">Contraseña</p>
						<p class="text-sm text-muted-foreground">
							Restablece tu contraseña por correo electrónico
						</p>
					</div>
					<Button href="/reset-password" variant="outline" size="sm">Restablecer</Button>
				</div>
			</CardContent>
		</Card>
	</div>
</div>

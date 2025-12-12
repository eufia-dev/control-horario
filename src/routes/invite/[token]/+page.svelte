<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { hasActiveSession } from '$lib/auth';
	import { acceptInvitation } from '$lib/api/onboarding';
	import { auth } from '$lib/stores/auth';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent,
		CardFooter
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let token = $derived($page.params.token ?? '');
	let isLoading = $state(true);
	let isAccepting = $state(false);
	let error = $state<string | null>(null);
	let needsAuth = $state(false);
	let needsName = $state(false);
	let userName = $state($page.url.searchParams.get('userName') ?? '');

	const buildRedirectPath = () => {
		const base = `/invite/${token}`;
		const params = new SvelteURLSearchParams();
		if (userName.trim()) {
			params.set('userName', userName.trim());
		}
		return params.toString() ? `${base}?${params.toString()}` : base;
	};

	onMount(async () => {
		const hasSession = await hasActiveSession();

		if (!hasSession) {
			needsAuth = true;
			isLoading = false;
			return;
		}

		if (!userName.trim() && $auth.user?.name) {
			userName = $auth.user.name;
		}

		if (!userName.trim()) {
			needsName = true;
			isLoading = false;
			return;
		}

		await handleAcceptInvitation();
	});

	const handleAcceptInvitation = async () => {
		isAccepting = true;
		error = null;

		const trimmedName = userName.trim();
		if (!trimmedName) {
			error = 'Tu nombre es obligatorio para aceptar la invitación';
			needsName = true;
			isAccepting = false;
			isLoading = false;
			return;
		}

		needsName = false;

		try {
			const result = await acceptInvitation(token, trimmedName);

			if (result.status === 'ACTIVE' && result.user) {
				auth.setUser(result.user);
				await goto(resolve('/'));
			} else {
				error = 'La invitación no pudo ser procesada';
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al aceptar la invitación';
		} finally {
			isAccepting = false;
			isLoading = false;
		}
	};

	const handleGoToRegister = () => {
		const base = '/register';
		const params = new SvelteURLSearchParams({ redirect: buildRedirectPath() });
		goto(`${base}?${params.toString()}`);
	};

	const handleGoToLogin = () => {
		const base = '/login';
		const params = new SvelteURLSearchParams({ redirect: buildRedirectPath() });
		goto(`${base}?${params.toString()}`);
	};

	const handleRetry = () => {
		handleAcceptInvitation();
	};
</script>

<div class="grow flex items-center justify-center bg-background px-4 py-8">
	<Card class="w-full max-w-md">
		{#if isLoading}
			<CardHeader class="text-center">
				<div class="flex justify-center mb-4">
					<span class="material-symbols-rounded text-6xl! text-primary animate-pulse">mail</span>
				</div>
				<CardTitle class="text-xl">Procesando invitación...</CardTitle>
				<CardDescription>Verificando tu invitación, por favor espera</CardDescription>
			</CardHeader>
			<CardContent class="flex justify-center py-6">
				<span class="material-symbols-rounded animate-spin text-4xl! text-muted-foreground"
					>progress_activity</span
				>
			</CardContent>
		{:else if needsAuth}
			<CardHeader class="text-center">
				<div class="flex justify-center mb-4">
					<span class="material-symbols-rounded text-6xl! text-primary">person_add</span>
				</div>
				<CardTitle class="text-xl">Inicia sesión para continuar</CardTitle>
				<CardDescription>Necesitas una cuenta para aceptar esta invitación</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<p class="text-sm text-muted-foreground text-center">
					Has recibido una invitación para unirte a una empresa. Crea una cuenta o inicia sesión
					para aceptarla.
				</p>
				<div class="space-y-2">
					<Label for="user-name">Nombre completo</Label>
					<Input
						id="user-name"
						type="text"
						placeholder="Juan García"
						bind:value={userName}
						autocomplete="name"
					/>
					<p class="text-xs text-muted-foreground">
						Guardaremos este nombre para completar tu perfil al aceptar la invitación.
					</p>
				</div>
			</CardContent>
			<CardFooter class="flex flex-col gap-3">
				<Button class="w-full" onclick={handleGoToRegister}>
					<span class="material-symbols-rounded text-lg! mr-2">person_add</span>
					Crear cuenta
				</Button>
				<Button variant="outline" class="w-full" onclick={handleGoToLogin}>
					<span class="material-symbols-rounded text-lg! mr-2">login</span>
					Ya tengo cuenta
				</Button>
			</CardFooter>
		{:else if needsName}
			<CardHeader class="text-center">
				<div class="flex justify-center mb-4">
					<span class="material-symbols-rounded text-6xl! text-primary">badge</span>
				</div>
				<CardTitle class="text-xl">Completa tu nombre</CardTitle>
				<CardDescription>Lo usaremos para aceptar la invitación</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-2">
					<Label for="user-name-complete">Nombre completo</Label>
					<Input
						id="user-name-complete"
						type="text"
						placeholder="Juan García"
						bind:value={userName}
						autocomplete="name"
					/>
				</div>
				{#if error}
					<div
						class="flex items-center gap-3 p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20"
					>
						<span class="material-symbols-rounded text-xl!">warning</span>
						<p class="text-sm">{error}</p>
					</div>
				{/if}
			</CardContent>
			<CardFooter class="flex flex-col gap-3">
				<Button class="w-full" onclick={handleAcceptInvitation} disabled={isAccepting}>
					{#if isAccepting}
						Aceptando...
					{:else}
						<span class="material-symbols-rounded text-lg! mr-2">check_circle</span>
						Aceptar invitación
					{/if}
				</Button>
				<Button variant="outline" class="w-full" onclick={() => goto(resolve('/onboarding'))}>
					Ir al onboarding
				</Button>
			</CardFooter>
		{:else if error}
			<CardHeader class="text-center">
				<div class="flex justify-center mb-4">
					<span class="material-symbols-rounded text-6xl! text-destructive">error</span>
				</div>
				<CardTitle class="text-xl">Error con la invitación</CardTitle>
				<CardDescription>No se pudo procesar la invitación</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-2">
					<Label for="user-name-error">Nombre completo</Label>
					<Input
						id="user-name-error"
						type="text"
						placeholder="Juan García"
						bind:value={userName}
						autocomplete="name"
					/>
				</div>
				<div
					class="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20"
				>
					<span class="material-symbols-rounded text-xl!">warning</span>
					<p class="text-sm">{error}</p>
				</div>
			</CardContent>
			<CardFooter class="flex flex-col gap-3">
				<Button class="w-full" onclick={handleRetry} disabled={isAccepting}>
					{#if isAccepting}
						Reintentando...
					{:else}
						<span class="material-symbols-rounded text-lg! mr-2">refresh</span>
						Reintentar
					{/if}
				</Button>
				<Button variant="outline" class="w-full" onclick={() => goto(resolve('/onboarding'))}>
					Ir al onboarding
				</Button>
			</CardFooter>
		{:else}
			<CardHeader class="text-center">
				<div class="flex justify-center mb-4">
					<span class="material-symbols-rounded text-6xl! text-success">check_circle</span>
				</div>
				<CardTitle class="text-xl">Invitación aceptada</CardTitle>
				<CardDescription>Redirigiendo al dashboard...</CardDescription>
			</CardHeader>
			<CardContent class="flex justify-center py-6">
				<span class="material-symbols-rounded animate-spin text-4xl! text-muted-foreground"
					>progress_activity</span
				>
			</CardContent>
		{/if}
	</Card>
</div>

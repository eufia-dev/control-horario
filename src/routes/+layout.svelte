<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { auth, isAuthenticated, type AuthUser } from '$lib/stores/auth';
	import { initAuthFromRefresh, logout } from '$lib/auth';
	import { slide } from 'svelte/transition';

	import { Button } from '$lib/components/ui/button';
	import { stringToColor, getInitials } from '$lib/utils';

	let { children } = $props();

	let isInitializing = $state(true);
	let isAuthed = $state(false);
	let user = $state<AuthUser | null>(null);
	let mobileMenuOpen = $state(false);

	let unsubAuth: (() => void) | undefined;
	let unsubIsAuthed: (() => void) | undefined;

	function runGuards(pathname: string) {
		if (typeof window === 'undefined') return;
		if (isInitializing) return;

		const isLoginRoute = pathname === '/login';

		if (!isAuthed && !isLoginRoute) {
			goto('/login');
		} else if (isAuthed && isLoginRoute) {
			goto('/');
		}
	}

	onMount(() => {
		unsubAuth = auth.subscribe((state) => {
			isInitializing = state.isInitializing;
			user = state.user;
			if (typeof window !== 'undefined') {
				runGuards(window.location.pathname);
			}
		});

		unsubIsAuthed = isAuthenticated.subscribe((value) => {
			isAuthed = value;
			if (typeof window !== 'undefined') {
				runGuards(window.location.pathname);
			}
		});

		initAuthFromRefresh().finally(() => {
			// auth store itself will set isInitializing to false
		});

		afterNavigate((navigation) => {
			if (typeof window === 'undefined') return;
			const pathname = navigation.to?.url.pathname ?? window.location.pathname;
			runGuards(pathname);
		});

		if (typeof window !== 'undefined') {
			runGuards(window.location.pathname);
		}

		return () => {
			unsubAuth?.();
			unsubIsAuthed?.();
		};
	});

	const handleLogout = async () => {
		await logout();
		await goto('/login');
	};

	const avatarColor = $derived(user?.id ? stringToColor(user.id) : '#6b7280');
	const initials = $derived(user?.name ? getInitials(user.name) : '');
</script>

<div class="min-h-screen flex flex-col">
	<header class="relative flex items-center justify-between px-4 py-3 border-b border-border">
		<div class="flex items-center gap-4">
			<a
				href="/"
				class="flex items-center gap-2">
				<span>Control horario</span>
				{#if isAuthed && user?.organizationName}
					<span class="hidden sm:inline">-</span>
					<span class="hidden sm:inline font-semibold tracking-tight">{user.organizationName}</span>
				{/if}
			</a>
			
			<!-- Desktop navigation -->
			{#if isAuthed && user?.isAdmin}
				<nav class="hidden md:flex items-center gap-1 ml-4 border-l border-border pl-4">
					<Button
						href="/"
						variant="ghost"
						size="sm"
						class="gap-1.5"
					>
						<span class="material-symbols-rounded text-lg!">schedule</span>
						<span>Fichajes</span>
					</Button>
					<Button
						href="/admin"
						variant="ghost"
						size="sm"
						class="gap-1.5"
					>
						<span class="material-symbols-rounded text-lg!">settings</span>
						<span>Configuración</span>
					</Button>
					<Button
						href="/analytics"
						variant="ghost"
						size="sm"
						class="gap-1.5"
					>
						<span class="material-symbols-rounded text-lg!">analytics</span>
						<span>Analíticas</span>
					</Button>
				</nav>
			{/if}
		</div>
		
		{#if isAuthed && user}
			<div class="flex items-center gap-2">
				<a
					href="/profile"
					class="flex items-center justify-center rounded-full text-sm font-medium text-white size-8 shrink-0
						hover:ring-2 hover:ring-ring hover:ring-offset-2 hover:ring-offset-background transition-shadow"
					style="background-color: {avatarColor}"
					title={user.name}
				>
					{initials}
				</a>
				<Button
					type="button"
					onclick={handleLogout}
					variant="ghost"
					size="sm"
					class="hidden sm:flex"
				>
					<span class="material-symbols-rounded text-lg!">logout</span>
				</Button>
				<!-- Mobile menu button (admin only) -->
				{#if user?.isAdmin}
					<Button
						type="button"
						onclick={() => mobileMenuOpen = !mobileMenuOpen}
						variant="ghost"
						size="sm"
						class="md:hidden"
					>
						<span class="material-symbols-rounded text-lg!">
							{mobileMenuOpen ? 'close' : 'menu'}
						</span>
					</Button>
				{/if}
			</div>
		{/if}
		
		<!-- Mobile menu dropdown -->
		{#if isAuthed && user?.isAdmin && mobileMenuOpen}
			<div 
				class="fixed inset-0 top-[57px] md:hidden bg-background z-50 flex flex-col"
				transition:slide={{ duration: 200 }}
			>
				<nav class="flex flex-col p-4 gap-2 flex-1">
					{#if user?.organizationName}
						<div class="px-4 py-3 text-base text-muted-foreground font-medium border-b border-border mb-2">
							{user.organizationName}
						</div>
					{/if}
					<Button
						href="/"
						variant="ghost"
						size="lg"
						class="justify-start gap-4 h-14 text-lg"
						onclick={() => mobileMenuOpen = false}
					>
						<span class="material-symbols-rounded text-2xl!">schedule</span>
						<span>Fichajes</span>
					</Button>
					<Button
						href="/admin"
						variant="ghost"
						size="lg"
						class="justify-start gap-4 h-14 text-lg"
						onclick={() => mobileMenuOpen = false}
					>
						<span class="material-symbols-rounded text-2xl!">settings</span>
						<span>Configuración</span>
					</Button>
					<Button
						href="/analytics"
						variant="ghost"
						size="lg"
						class="justify-start gap-4 h-14 text-lg"
						onclick={() => mobileMenuOpen = false}
					>
						<span class="material-symbols-rounded text-2xl!">analytics</span>
						<span>Analíticas</span>
					</Button>
				</nav>
				<div class="p-4 border-t border-border mt-auto">
					<Button
						type="button"
						onclick={() => { mobileMenuOpen = false; handleLogout(); }}
						variant="ghost"
						size="lg"
						class="justify-start gap-4 w-full h-14 text-lg text-destructive hover:text-destructive"
					>
						<span class="material-symbols-rounded text-2xl!">logout</span>
						<span>Cerrar sesión</span>
					</Button>
				</div>
			</div>
		{/if}
	</header>

	<main class="grow flex flex-col">
		{#if isInitializing}
			<div class="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">
				Comprobando sesión...
			</div>
		{:else}
			{@render children()}
		{/if}
	</main>
</div>


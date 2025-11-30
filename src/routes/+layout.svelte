<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { auth, isAuthenticated, type AuthUser } from '$lib/stores/auth';
	import { initAuthFromRefresh, logout } from '$lib/auth';

	import { Button } from '$lib/components/ui/button';
	import { stringToColor, getInitials } from '$lib/utils';

	let { children } = $props();

	let isInitializing = $state(true);
	let isAuthed = $state(false);
	let user = $state<AuthUser | null>(null);

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
	<header class="flex items-center justify-between px-4 py-3 border-b border-border">
		<div class="flex items-center gap-6">
			<a
				href="/"
				class="flex items-center gap-2">
				<span>Control horario</span>
				{#if isAuthed && user?.organizationName}
					<span>-</span>
					<span class="font-semibold tracking-tight">{user.organizationName}</span>
				{/if}
			</a>
			
			{#if isAuthed && user?.isAdmin}
				<nav class="flex items-center gap-1 ml-4 border-l border-border pl-6">
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
						href="/analytics"
						variant="ghost"
						size="sm"
						class="gap-1.5"
					>
						<span class="material-symbols-rounded text-lg!">analytics</span>
						<span>Analytics</span>
					</Button>
					<Button
						href="/admin"
						variant="ghost"
						size="sm"
						class="gap-1.5"
					>
						<span class="material-symbols-rounded text-lg!">settings</span>
						<span>Ajustes</span>
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
				>
					<span class="material-symbols-rounded text-lg!">logout</span>
				</Button>
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


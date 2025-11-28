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
		<a href="/" class="font-semibold tracking-tight">Control horario</a>
		{#if isAuthed && user}
			<div class="flex items-center gap-3">
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
					variant="outline"
					size="sm"
				>
					Log out
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


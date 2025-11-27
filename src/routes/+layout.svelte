<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { auth, isAuthenticated } from '$lib/stores/auth';
	import { initAuthFromRefresh, logout } from '$lib/auth';

	let { children } = $props();

	let isInitializing = $state(true);
	let isAuthed = $state(false);

	let unsubAuth: (() => void) | undefined;
	let unsubIsAuthed: (() => void) | undefined;

	function runGuards(pathname: string) {
		if (typeof window === 'undefined') return;
		if (isInitializing) return;

		const isLoginRoute = pathname === '/login';
		const isResetRoute = pathname === '/reset-password';

		if (!isAuthed && !isLoginRoute && !isResetRoute) {
			goto('/login');
		} else if (isAuthed && isLoginRoute) {
			goto('/');
		}
	}

	onMount(() => {
		unsubAuth = auth.subscribe((state) => {
			isInitializing = state.isInitializing;
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
</script>

<div class="min-h-screen flex flex-col">
	<header class="flex items-center justify-between px-4 py-3 border-b border-border">
		<div class="font-semibold tracking-tight">Control horario</div>
		{#if isAuthed}
			<button
				type="button"
				onclick={handleLogout}
				class="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted transition-colors"
			>
				Log out
			</button>
		{/if}
	</header>

	<main class="flex-1">
		{#if isInitializing}
			<div class="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">
				Comprobando sesión...
			</div>
		{:else}
			{@render children()}
		{/if}
	</main>
</div>


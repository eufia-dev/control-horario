<script lang="ts">
	import '../app.css';
	import { onMount, onDestroy } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth, isAuthenticated, isSignedIn, isAdmin, type AuthUser } from '$lib/stores/auth';
	import { initAuth, logout, subscribeToAuthChanges, routeForOnboardingStatus, initAuthSyncChannel, checkAndSetOnboardingStatus } from '$lib/auth';
	import { slide } from 'svelte/transition';

	import { Button } from '$lib/components/ui/button';
	import { stringToColor, getInitials } from '$lib/utils';
	import type { OnboardingStatusType } from '$lib/api/onboarding';

	let { children } = $props();

	let isInitializing = $state(true);
	let isAuthed = $state(false);
	let signedIn = $state(false);
	let isUserAdmin = $state(false);
	let user = $state<AuthUser | null>(null);
	let onboardingStatus = $state<OnboardingStatusType | null>(null);
	let mobileMenuOpen = $state(false);

	let unsubAuth: (() => void) | undefined;
	let unsubIsAuthed: (() => void) | undefined;
	let unsubIsSignedIn: (() => void) | undefined;
	let unsubIsAdmin: (() => void) | undefined;
	let unsubAuthChanges: { data: { subscription: { unsubscribe: () => void } } } | undefined;

	const publicRoutes = ['/login', '/register', '/reset-password'];

	const onboardingRoutes = [
		'/onboarding',
		'/onboarding/create-company',
		'/onboarding/join',
		'/onboarding/status'
	];

	const inviteRoutePrefix = '/invite/';
	const authCallbackPrefix = '/auth/callback';

	const pathname = $derived($page.url.pathname);
	const isAuthCallbackPage = $derived(isAuthCallbackRoute(pathname));

	function isPublicRoute(pathname: string): boolean {
		return publicRoutes.includes(pathname);
	}

	function isOnboardingRoute(pathname: string): boolean {
		return onboardingRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));
	}

	function isInviteRoute(pathname: string): boolean {
		return pathname.startsWith(inviteRoutePrefix);
	}

	function isAuthCallbackRoute(pathname: string): boolean {
		return pathname.startsWith(authCallbackPrefix);
	}

	function runGuards(pathname: string) {
		if (typeof window === 'undefined') return;

		if (isAuthCallbackRoute(pathname)) return;

		if (isInitializing) return;

		const onboardingRedirect = routeForOnboardingStatus(onboardingStatus);
		const isSignedIn =
			isAuthed ||
			Boolean(user) ||
			onboardingStatus === 'ONBOARDING_REQUIRED' ||
			onboardingStatus === 'PENDING_APPROVAL';

		if (pathname === '/reset-password') return;

		if (isInviteRoute(pathname)) return;

		if (!isSignedIn) {
			if (isPublicRoute(pathname)) return;

			goto('/login');
			return;
		}

		if (isPublicRoute(pathname)) {
			goto(onboardingRedirect);
			return;
		}

		if (onboardingStatus === 'ONBOARDING_REQUIRED') {
			if (!isOnboardingRoute(pathname) && !isInviteRoute(pathname)) {
				goto(routeForOnboardingStatus('ONBOARDING_REQUIRED'));
			}
			return;
		}

		if (onboardingStatus === 'PENDING_APPROVAL') {
			const allowedPendingRoutes = ['/onboarding/status', '/onboarding/join'];
			if (!allowedPendingRoutes.some((r) => pathname.startsWith(r)) && !isInviteRoute(pathname)) {
				goto(routeForOnboardingStatus('PENDING_APPROVAL'));
			}
			return;
		}

		if (onboardingStatus === 'ACTIVE' && isOnboardingRoute(pathname)) {
			goto(routeForOnboardingStatus('ACTIVE'));
			return;
		}
	}

	onMount(() => {
		unsubAuth = auth.subscribe((state) => {
			isInitializing = state.isInitializing;
			user = state.user;
			onboardingStatus = state.onboardingStatus;
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

		unsubIsSignedIn = isSignedIn.subscribe((value) => {
			signedIn = value;
		});

		unsubIsAdmin = isAdmin.subscribe((value) => {
			isUserAdmin = value;
		});

		unsubAuthChanges = subscribeToAuthChanges();

		initAuthSyncChannel();

		const handleVisibilityChange = async () => {
			if (document.visibilityState === 'visible' && 
				(onboardingStatus === 'ONBOARDING_REQUIRED' || onboardingStatus === 'PENDING_APPROVAL')) {
				try {
					await checkAndSetOnboardingStatus();
				} catch {
				}
			}
		};
		document.addEventListener('visibilitychange', handleVisibilityChange);

		initAuth().finally(() => {});

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
			unsubIsSignedIn?.();
			unsubIsAdmin?.();
			unsubAuthChanges?.data.subscription.unsubscribe();
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	});

	onDestroy(() => {
		unsubAuth?.();
		unsubIsAuthed?.();
	unsubIsSignedIn?.();
		unsubIsAdmin?.();
		unsubAuthChanges?.data.subscription.unsubscribe();
	});

	const handleLogout = async () => {
		await logout();
		await goto('/login');
	};

	const avatarColor = $derived(user?.id ? stringToColor(user.id) : '#6b7280');
	const initials = $derived(user?.name ? getInitials(user.name) : '');

	const showHeader = $derived(onboardingStatus === 'ACTIVE' || (!isInitializing && !isAuthed));
</script>

<div class="min-h-screen flex flex-col">
	{#if showHeader}
		<header class="relative flex items-center justify-between px-4 py-3 border-b border-border">
			<div class="flex items-center gap-4">
				<a href="/" class="flex items-center gap-2">
					<span>Control horario</span>
					{#if isAuthed && user?.companyName}
						<span class="hidden sm:inline">-</span>
						<span class="hidden sm:inline font-semibold tracking-tight">{user.companyName}</span>
					{/if}
				</a>

				{#if isAuthed && isUserAdmin}
					<nav class="hidden md:flex items-center gap-1 ml-4 border-l border-border pl-4">
						<Button href="/" variant="ghost" size="sm" class="gap-1.5">
							<span class="material-symbols-rounded text-lg!">schedule</span>
							<span>Fichajes</span>
						</Button>
						<Button href="/admin" variant="ghost" size="sm" class="gap-1.5">
							<span class="material-symbols-rounded text-lg!">settings</span>
							<span>Configuración</span>
						</Button>
						<Button href="/analytics" variant="ghost" size="sm" class="gap-1.5">
							<span class="material-symbols-rounded text-lg!">analytics</span>
							<span>Analíticas</span>
						</Button>
					</nav>
				{/if}
			</div>

			{#if signedIn}
				<div class="flex items-center gap-2">
					{#if isAuthed}
						<nav class="hidden md:flex items-center gap-1 border-r border-border pr-4 mr-2">
							<Button href="/bug-report" variant="ghost" size="sm" class="gap-1.5">
								<span class="material-symbols-rounded text-lg!">bug_report</span>
								<span>Reportar bug</span>
							</Button>
							<Button href="/contact" variant="ghost" size="sm" class="gap-1.5">
								<span class="material-symbols-rounded text-lg!">mail</span>
								<span>Contacto</span>
							</Button>
						</nav>
					{/if}
					{#if user}
						<a
							href="/profile"
							class="flex items-center justify-center rounded-full text-sm font-medium text-white size-8 shrink-0
								hover:ring-2 hover:ring-ring hover:ring-offset-2 hover:ring-offset-background transition-shadow"
							style="background-color: {avatarColor}"
							title={user.name}
						>
							{initials}
						</a>
					{/if}
					<Button
						type="button"
						onclick={handleLogout}
						variant="ghost"
						size="sm"
						class={user ? 'hidden md:flex' : 'flex'}
					>
						<span class="material-symbols-rounded text-lg!">logout</span>
					</Button>
					{#if isAuthed && user}
						<Button
							type="button"
							onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
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

			{#if isAuthed && mobileMenuOpen}
				<div
					class="fixed inset-0 top-[57px] md:hidden bg-background z-50 flex flex-col"
					transition:slide={{ duration: 200 }}
				>
					<nav class="flex flex-col p-4 gap-2 flex-1">
						{#if user?.companyName}
							<div
								class="px-4 py-3 text-base text-muted-foreground font-medium border-b border-border mb-2"
							>
								{user.companyName}
							</div>
						{/if}
						{#if isUserAdmin}
							<Button
								href="/"
								variant="ghost"
								size="lg"
								class="justify-start gap-4 h-14 text-lg"
								onclick={() => (mobileMenuOpen = false)}
							>
								<span class="material-symbols-rounded text-2xl!">schedule</span>
								<span>Fichajes</span>
							</Button>
							<Button
								href="/admin"
								variant="ghost"
								size="lg"
								class="justify-start gap-4 h-14 text-lg"
								onclick={() => (mobileMenuOpen = false)}
							>
								<span class="material-symbols-rounded text-2xl!">settings</span>
								<span>Configuración</span>
							</Button>
							<Button
								href="/analytics"
								variant="ghost"
								size="lg"
								class="justify-start gap-4 h-14 text-lg"
								onclick={() => (mobileMenuOpen = false)}
							>
								<span class="material-symbols-rounded text-2xl!">analytics</span>
								<span>Analíticas</span>
							</Button>
						{/if}
						<Button
							href="/bug-report"
							variant="ghost"
							size="lg"
							class="justify-start gap-4 h-14 text-lg"
							onclick={() => (mobileMenuOpen = false)}
						>
							<span class="material-symbols-rounded text-2xl!">bug_report</span>
							<span>Reportar bug</span>
						</Button>
						<Button
							href="/contact"
							variant="ghost"
							size="lg"
							class="justify-start gap-4 h-14 text-lg"
							onclick={() => (mobileMenuOpen = false)}
						>
							<span class="material-symbols-rounded text-2xl!">mail</span>
							<span>Contacto</span>
						</Button>
					</nav>
					<div class="p-4 border-t border-border mt-auto">
						<Button
							type="button"
							onclick={() => {
								mobileMenuOpen = false;
								handleLogout();
							}}
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
	{/if}

	<main class="grow flex flex-col">
		{#if isInitializing && !isAuthCallbackPage}
			<div class="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">
				Comprobando sesión...
			</div>
		{:else}
			{@render children()}
		{/if}
	</main>
</div>

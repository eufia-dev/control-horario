<script lang="ts">
	import '../app.css';
	import { onMount, onDestroy } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth, isAuthenticated, isAdmin, type AuthUser } from '$lib/stores/auth';
	import { initAuth, logout, subscribeToAuthChanges, routeForOnboardingStatus } from '$lib/auth';
	import { slide } from 'svelte/transition';

	import { Button } from '$lib/components/ui/button';
	import { stringToColor, getInitials } from '$lib/utils';
	import type { OnboardingStatusType } from '$lib/api/onboarding';

	let { children } = $props();

	let isInitializing = $state(true);
	let isAuthed = $state(false);
	let isUserAdmin = $state(false);
	let user = $state<AuthUser | null>(null);
	let onboardingStatus = $state<OnboardingStatusType | null>(null);
	let mobileMenuOpen = $state(false);

	let unsubAuth: (() => void) | undefined;
	let unsubIsAuthed: (() => void) | undefined;
	let unsubIsAdmin: (() => void) | undefined;
	let unsubAuthChanges: { data: { subscription: { unsubscribe: () => void } } } | undefined;

// Public routes that don't require authentication
const publicRoutes = ['/login', '/register', '/reset-password'];

// Routes that are accessible during onboarding
const onboardingRoutes = ['/onboarding', '/onboarding/create-company', '/onboarding/join', '/onboarding/status'];

// Routes for invite handling
const inviteRoutePrefix = '/invite/';
const authCallbackPrefix = '/auth/callback';

const pathname = $derived($page.url.pathname);
const isAuthCallbackPage = $derived(isAuthCallbackRoute(pathname));

	function isPublicRoute(pathname: string): boolean {
		return publicRoutes.includes(pathname);
	}

	function isOnboardingRoute(pathname: string): boolean {
		return onboardingRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));
	}

	function isInviteRoute(pathname: string): boolean {
		return pathname.startsWith(inviteRoutePrefix);
	}

	function isAuthCallbackRoute(pathname: string): boolean {
		return pathname.startsWith(authCallbackPrefix);
	}

	function runGuards(pathname: string) {
		if (typeof window === 'undefined') return;

		// Allow access to auth callback routes always, even while initializing
		if (isAuthCallbackRoute(pathname)) return;

		if (isInitializing) return;

		const onboardingRedirect = routeForOnboardingStatus(onboardingStatus);
		const isSignedIn =
			isAuthed ||
			Boolean(user) ||
			onboardingStatus === 'ONBOARDING_REQUIRED' ||
			onboardingStatus === 'PENDING_APPROVAL';

		// Allow access to reset password route always
		if (pathname === '/reset-password') return;

		// Allow access to invite routes always (they handle their own auth check)
		if (isInviteRoute(pathname)) return;

		// Not authenticated (and not in onboarding states)
		if (!isSignedIn) {
			// Allow public routes
			if (isPublicRoute(pathname)) return;

			// Redirect to login for protected routes
			goto('/login');
			return;
		}

		// If on login/register and already signed-in/onboarding, redirect based on status
		if (isPublicRoute(pathname)) {
			goto(onboardingRedirect);
			return;
		}

		// Handle onboarding status redirects
		if (onboardingStatus === 'ONBOARDING_REQUIRED') {
			// Only allow onboarding routes
			if (!isOnboardingRoute(pathname) && !isInviteRoute(pathname)) {
				goto(routeForOnboardingStatus('ONBOARDING_REQUIRED'));
			}
			return;
		}

		if (onboardingStatus === 'PENDING_APPROVAL') {
			// Only allow status page and join page for submitting new requests
			const allowedPendingRoutes = ['/onboarding/status', '/onboarding/join'];
			if (!allowedPendingRoutes.some(r => pathname.startsWith(r)) && !isInviteRoute(pathname)) {
				goto(routeForOnboardingStatus('PENDING_APPROVAL'));
			}
			return;
		}

		// ACTIVE status - redirect away from onboarding routes
		if (onboardingStatus === 'ACTIVE' && isOnboardingRoute(pathname)) {
			goto(routeForOnboardingStatus('ACTIVE'));
			return;
		}
	}

	onMount(() => {
		unsubAuth = auth.subscribe((state) => {
			console.debug('auth state changed', state);
			isInitializing = state.isInitializing;
			console.debug('isInitializing', isInitializing);
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

		unsubIsAdmin = isAdmin.subscribe((value) => {
			isUserAdmin = value;
		});

		// Subscribe to Supabase auth state changes
		unsubAuthChanges = subscribeToAuthChanges();

		// Initialize auth from Supabase session
		initAuth().finally(() => {
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
			unsubIsAdmin?.();
			unsubAuthChanges?.data.subscription.unsubscribe();
		};
	});

	onDestroy(() => {
		unsubAuth?.();
		unsubIsAuthed?.();
		unsubIsAdmin?.();
		unsubAuthChanges?.data.subscription.unsubscribe();
	});

	const handleLogout = async () => {
		await logout();
		await goto('/login');
	};

	const avatarColor = $derived(user?.id ? stringToColor(user.id) : '#6b7280');
	const initials = $derived(user?.name ? getInitials(user.name) : '');

	// Determine if we should show the header
	const showHeader = $derived(
		onboardingStatus === 'ACTIVE' ||
		(!isInitializing && !isAuthed)
	);
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

				<!-- Desktop navigation -->
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
					{#if isUserAdmin}
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

			<!-- Mobile menu dropdown -->
			{#if isAuthed && isUserAdmin && mobileMenuOpen}
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

import { PUBLIC_API_URL } from '$env/static/public';
import { get } from 'svelte/store';
import { auth, type AuthUser, type Profile } from '$lib/stores/auth';
import { supabase } from '$lib/supabase/client';
import type { User } from '$lib/api/users';
import {
	checkOnboardingStatus as apiCheckOnboarding,
	type OnboardingStatusType
} from '$lib/api/onboarding';

// Extended status type that includes email confirmation state
export type AuthStatusType = OnboardingStatusType | 'EMAIL_CONFIRMATION_REQUIRED';

const API_BASE = PUBLIC_API_URL;

// Storage key for the active profile ID
const PROFILE_STORAGE_KEY = 'control_horario_active_profile';

/**
 * Get the active profile ID from localStorage
 */
export function getActiveProfileId(): string | null {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem(PROFILE_STORAGE_KEY);
}

/**
 * Set the active profile ID in localStorage
 */
export function setActiveProfileId(profileId: string): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem(PROFILE_STORAGE_KEY, profileId);
}

/**
 * Clear the active profile ID from localStorage
 */
export function clearActiveProfileId(): void {
	if (typeof window === 'undefined') return;
	localStorage.removeItem(PROFILE_STORAGE_KEY);
}

async function handleJsonResponse<T>(response: Response): Promise<T> {
	const text = await response.text();

	if (!response.ok) {
		let message = 'Error inesperado';
		try {
			const data = text ? JSON.parse(text) : null;
			message = data?.message ?? message;
		} catch {
			if (text) {
				message = text;
			}
		}
		throw new Error(message);
	}

	return text ? (JSON.parse(text) as T) : ({} as T);
}

/**
 * Get the current access token from Supabase session
 */
async function getAccessToken(): Promise<string | null> {
	const {
		data: { session }
	} = await supabase.auth.getSession();

	return session?.access_token ?? null;
}

/**
 * Check onboarding status and update auth store accordingly
 * Returns the status type for routing decisions
 * @param tokenOverride - Optional token to use (useful right after login/signup when session might not be stored yet)
 */
export async function checkAndSetOnboardingStatus(
	tokenOverride?: string,
	options?: { broadcastActive?: boolean }
): Promise<OnboardingStatusType> {
	const { broadcastActive = true } = options ?? {};
	const previous = get(auth);
	const wasActive = Boolean(previous.user) || previous.onboardingStatus === 'ACTIVE';

	const result = await apiCheckOnboarding(tokenOverride);

	if (result.status === 'ACTIVE' && result.user) {
		auth.setUser(result.user);

		// Load profiles for multi-tenancy support
		try {
			await loadAndSetProfiles(tokenOverride);
		} catch (err) {
			console.error('[auth] Failed to load profiles', err);
			// Continue even if profiles fail - user can still work with default profile
		}

		if (broadcastActive && !wasActive) {
			broadcastOnboardingComplete();
		}
		return 'ACTIVE';
	} else if (result.status === 'ONBOARDING_REQUIRED') {
		auth.setOnboardingStatus('ONBOARDING_REQUIRED', result.pendingInvitations ?? [], []);
		return 'ONBOARDING_REQUIRED';
	} else if (result.status === 'PENDING_APPROVAL') {
		auth.setOnboardingStatus('PENDING_APPROVAL', [], result.requests ?? []);
		return 'PENDING_APPROVAL';
	}

	return result.status;
}

/**
 * Map onboarding status to the route the user should see.
 */
export function routeForOnboardingStatus(status: OnboardingStatusType | null): string {
	switch (status) {
		case 'ACTIVE':
			return '/';
		case 'ONBOARDING_REQUIRED':
			return '/onboarding';
		case 'PENDING_APPROVAL':
			return '/onboarding/status';
		default:
			return '/onboarding';
	}
}

/**
 * Register a new user with email and password using Supabase Auth
 * Returns EMAIL_CONFIRMATION_REQUIRED if email verification is needed
 */
export async function register(email: string, password: string): Promise<AuthStatusType> {
	auth.setError(null);

	const { data, error } = await supabase.auth.signUp({
		email,
		password,
		options: {
			// Preserve flow type so callback can differentiate signup confirmation
			emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`
		}
	});

	if (error) {
		throw new Error(error.message);
	}

	// If no session is returned, email confirmation is required
	// This happens when Supabase is configured to require email verification
	if (!data.session) {
		return 'EMAIL_CONFIRMATION_REQUIRED';
	}

	// If session exists (email confirmation disabled), proceed with onboarding check
	return await checkAndSetOnboardingStatus(data.session.access_token);
}

/**
 * Login with email and password using Supabase Auth
 * Returns the onboarding status for routing decisions
 */
export async function login(email: string, password: string): Promise<OnboardingStatusType> {
	auth.setError(null);

	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password
	});

	if (error) {
		throw new Error(error.message);
	}

	// For login, we should always get a session (user must have verified email to login)
	// Use the token from the response to avoid race conditions with getSession()
	const token = data.session?.access_token;
	return await checkAndSetOnboardingStatus(token);
}

/**
 * Logout from Supabase and reset auth store
 */
export async function logout(): Promise<void> {
	try {
		await supabase.auth.signOut();
	} catch {
		// ignore errors on logout
	} finally {
		// Clear profile from localStorage
		clearActiveProfileId();
		auth.reset();
	}
}

/**
 * Initialize auth state by checking Supabase session
 */
export async function initAuth(): Promise<void> {
	const current = get(auth);
	if (current.user) {
		auth.setInitializing(false);
		return;
	}

	auth.setInitializing(true);
	auth.setError(null);

	try {
		const accessToken = await getAccessToken();

		if (accessToken) {
			await checkAndSetOnboardingStatus();
		}
	} catch {
		auth.reset();
	} finally {
		auth.setInitializing(false);
	}
}

/**
 * Send password reset email via Supabase
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
	const { error } = await supabase.auth.resetPasswordForEmail(email, {
		// Preserve recovery flow marker so callback renders the password reset UI
		redirectTo: `${window.location.origin}/auth/callback?type=recovery`
	});

	if (error) {
		throw new Error(error.message);
	}
}

/**
 * Resend confirmation email for a user who registered but hasn't confirmed yet.
 * This uses the signup type to resend the email verification link.
 */
export async function resendConfirmationEmail(email: string): Promise<void> {
	const { error } = await supabase.auth.resend({
		type: 'signup',
		email,
		options: {
			// Preserve flow type for signup confirmation resend
			emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`
		}
	});

	if (error) {
		throw new Error(error.message);
	}
}

/**
 * Update password for the currently logged in user (used after clicking reset link)
 */
export async function updatePassword(newPassword: string): Promise<void> {
	const { error } = await supabase.auth.updateUser({
		password: newPassword
	});

	if (error) {
		throw new Error(error.message);
	}
}

/**
 * Update user profile (name and email)
 */
export async function updateProfile(name: string, email: string): Promise<AuthUser> {
	const { user } = get(auth);

	if (!user) {
		throw new Error('No estás autenticado');
	}

	// Import fetchUsers dynamically to avoid circular dependency
	const { fetchUsers } = await import('$lib/api/users');

	// Fetch current user data to get all required fields
	const users = await fetchUsers();
	const currentUser = users.find((u) => u.id === user.id);

	if (!currentUser) {
		throw new Error('Usuario no encontrado');
	}

	// Update user with new name and email, keeping other fields
	const response = await fetchWithAuth(`${API_BASE}/users/${user.id}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			name,
			email,
			hourlyCost: currentUser.hourlyCost,
			isActive: currentUser.isActive,
			role: currentUser.role
		})
	});

	const updatedUser = await handleJsonResponse<User>(response);

	// Update auth store with the new user data
	const updatedAuthUser: AuthUser = {
		id: updatedUser.id,
		name: updatedUser.name,
		email: updatedUser.email,
		companyName: user.companyName,
		role: updatedUser.role,
		relation: updatedUser.relation,
		createdAt: updatedUser.createdAt
	};

	auth.setUser(updatedAuthUser);
	return updatedAuthUser;
}

/**
 * Fetch wrapper that adds Authorization header with Supabase access token
 * and X-Profile-Id header for multi-tenancy
 * @param input - The URL or Request object
 * @param init - Optional RequestInit options
 * @param tokenOverride - Optional token to use instead of fetching from session (useful after login/signup)
 */
export async function fetchWithAuth(
	input: RequestInfo | URL,
	init: RequestInit = {},
	tokenOverride?: string
): Promise<Response> {
	const accessToken = tokenOverride ?? (await getAccessToken());
	const profileId = getActiveProfileId();

	const headers = new Headers(init.headers);
	if (accessToken) {
		headers.set('Authorization', `Bearer ${accessToken}`);
	}
	if (profileId) {
		headers.set('X-Profile-Id', profileId);
	}

	const response = await fetch(input, {
		...init,
		headers
	});

	if (response.status === 401 && !tokenOverride) {
		// Try to refresh the session
		const { error } = await supabase.auth.refreshSession();

		if (error) {
			// Session refresh failed, logout
			await logout();
			return response;
		}

		// Retry with new token
		const newToken = await getAccessToken();
		if (newToken) {
			headers.set('Authorization', `Bearer ${newToken}`);
			const retryResponse = await fetch(input, {
				...init,
				headers
			});

			// If we still get unauthorized, force logout so the UI can recover
			if (retryResponse.status === 401) {
				await logout();
			}

			return retryResponse;
		}
	}

	return response;
}

type AuthCallbackMode = 'signin' | 'passwordReset' | 'error';

export type AuthCallbackResult = {
	mode: AuthCallbackMode;
	status?: OnboardingStatusType;
	nextRoute?: string;
	error?: string;
};

function isPkceVerifierMissing(error: { message?: string; error_description?: string }): boolean {
	const message = `${error?.message ?? ''} ${error?.error_description ?? ''}`.toLowerCase();
	return message.includes('code verifier') || message.includes('auth code');
}

/**
 * Remove Supabase hash/query parameters from the URL after handling the callback.
 */
export function cleanupAuthUrl(currentUrl?: URL) {
	if (typeof window === 'undefined') return;
	const url = currentUrl ?? new URL(window.location.href);
	const clean = new URL(url.href);

	// Strip hash (Supabase uses it for tokens)
	clean.hash = '';

	// Remove known auth-related query params but keep anything else
	clean.searchParams.delete('code');
	clean.searchParams.delete('type');

	window.history.replaceState({}, document.title, clean.pathname + clean.search + clean.hash);
}

/**
 * Handle Supabase auth callbacks (signup confirmation, magic link, recovery).
 * Returns the mode, onboarding status (if applicable), and the suggested next route.
 */
export async function processAuthCallback(
	locationOverride?: Location | URL
): Promise<AuthCallbackResult> {
	if (typeof window === 'undefined' && !locationOverride) {
		return { mode: 'error', error: 'Auth callback only runs in the browser' };
	}

	const url =
		locationOverride instanceof URL
			? locationOverride
			: new URL(locationOverride?.href ?? window.location.href);

	const hashParams = new URLSearchParams(
		url.hash.startsWith('#') ? url.hash.substring(1) : url.hash
	);
	const searchParams = url.searchParams;

	const hashType = hashParams.get('type');
	const urlType = searchParams.get('type');
	const type = hashType ?? urlType;

	const accessToken = hashParams.get('access_token');
	const refreshToken = hashParams.get('refresh_token');
	const code = searchParams.get('code');

	try {
		if (code) {
			let {
				data: { session }
			} = await supabase.auth.getSession();

			if (!session) {
				const { data, error } = await supabase.auth.exchangeCodeForSession(code);
				if (error) {
					if (type === 'signup' && isPkceVerifierMissing(error)) {
						return {
							mode: 'signin',
							nextRoute: '/login?confirmed=1'
						};
					}
					throw new Error('El enlace no es válido o ha expirado.');
				}
				session = data.session ?? null;
			}

			if (type === 'recovery') {
				auth.setInitializing(false);
				return { mode: 'passwordReset' };
			}

			const token = session?.access_token ?? (await getAccessToken());

			const status = await checkAndSetOnboardingStatus(token ?? undefined);
			return {
				mode: 'signin',
				status,
				nextRoute: routeForOnboardingStatus(status)
			};
		}

		// Recovery flow
		if (type === 'recovery') {
			if (accessToken && refreshToken) {
				const { error } = await supabase.auth.setSession({
					access_token: accessToken,
					refresh_token: refreshToken
				});

				if (error) {
					throw new Error('El enlace de recuperación no es válido o ha expirado.');
				}
			}

			// Ensure initializing is off for the recovery password UI
			auth.setInitializing(false);
			return { mode: 'passwordReset' };
		}

		// Email confirmation after signup (token in hash params)
		if (type === 'signup') {
			if (accessToken && refreshToken) {
				const { error } = await supabase.auth.setSession({
					access_token: accessToken,
					refresh_token: refreshToken
				});

				if (error) {
					throw new Error('El enlace de confirmación no es válido o ha expirado.');
				}
			}

			const status = await checkAndSetOnboardingStatus();
			return {
				mode: 'signin',
				status,
				nextRoute: routeForOnboardingStatus(status)
			};
		}

		return { mode: 'error', error: 'Tipo de enlace no válido.' };
	} catch (err) {
		return {
			mode: 'error',
			error: err instanceof Error ? err.message : 'No se pudo procesar el enlace.'
		};
	}
}

/**
 * Subscribe to Supabase auth state changes.
 * Supabase broadcasts auth events across tabs, so this keeps the store in sync everywhere.
 */
export function subscribeToAuthChanges() {
	return supabase.auth.onAuthStateChange(async (event, session) => {
		if (event === 'SIGNED_OUT') {
			auth.reset();
		} else if (event === 'SIGNED_IN' && session) {
			// Avoid duplicate onboarding checks if state is already populated (e.g., after login/signup handlers)
			const state = get(auth);
			if (state.user || state.onboardingStatus) return;
			try {
				await checkAndSetOnboardingStatus(session.access_token);
			} catch (err) {
				console.error('[auth] onboarding check failed after SIGNED_IN', err);
				auth.reset();
			}
		} else if (event === 'TOKEN_REFRESHED' && session) {
			// Token was refreshed, user data should already be in store.
			// If for any reason we don't have it, re-run onboarding check with the fresh token.
			const state = get(auth);
			if (!state.user && !state.onboardingStatus) {
				try {
					await checkAndSetOnboardingStatus(session.access_token);
				} catch (err) {
					console.error('[auth] onboarding check failed after TOKEN_REFRESHED', err);
					auth.reset();
				}
			}
		}
	});
}

/**
 * Check if there's an active Supabase session (for checking auth without full init)
 */
export async function hasActiveSession(): Promise<boolean> {
	const {
		data: { session }
	} = await supabase.auth.getSession();
	return !!session;
}

// Cross-tab sync for onboarding state changes
const AUTH_SYNC_CHANNEL = 'auth-sync';
let authChannel: BroadcastChannel | null = null;

/**
 * Initialize the BroadcastChannel for cross-tab auth state sync.
 * When another tab completes onboarding, this tab will re-check its status.
 */
export function initAuthSyncChannel() {
	if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
	if (authChannel) return;

	authChannel = new BroadcastChannel(AUTH_SYNC_CHANNEL);
	authChannel.onmessage = async (event) => {
		if (event.data?.type === 'ONBOARDING_COMPLETED') {
			const state = get(auth);
			if (state.user || state.onboardingStatus === 'ACTIVE') return;

			try {
				await checkAndSetOnboardingStatus(undefined, { broadcastActive: false });
			} catch (err) {
				console.error('[auth] Failed to sync onboarding status from other tab', err);
			}
		}
	};
}

/**
 * Broadcast to other tabs that onboarding has been completed.
 * Called when a user becomes ACTIVE (joins a company or creates one).
 */
export function broadcastOnboardingComplete() {
	authChannel?.postMessage({ type: 'ONBOARDING_COMPLETED' });
}

type ProfilesResponse = {
	profiles: Profile[];
	currentProfileId: string | null;
};

/**
 * Fetch all profiles for the current user
 * Returns an object with profiles array and the current profile ID from the server
 */
export async function fetchProfiles(tokenOverride?: string): Promise<ProfilesResponse> {
	const response = await fetchWithAuth(`${API_BASE}/auth/profiles`, {}, tokenOverride);
	const data = await handleJsonResponse<ProfilesResponse>(response);
	return {
		profiles: data.profiles,
		currentProfileId: data.currentProfileId ?? null
	};
}

/**
 * Switch to a different profile (validates the profile belongs to the user)
 */
export async function switchProfile(profileId: string): Promise<Profile> {
	const response = await fetchWithAuth(`${API_BASE}/auth/switch-profile`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ profileId })
	});
	return handleJsonResponse<Profile>(response);
}

/**
 * Load and set profiles in auth store.
 * Determines the active profile based on:
 * 1. Stored preference in localStorage (user's explicit choice)
 * 2. Server's currentProfileId (from API response)
 * 3. First available profile as fallback
 * Returns true if profiles need selection (multiple profiles, none stored).
 */
export async function loadAndSetProfiles(tokenOverride?: string): Promise<boolean> {
	const { profiles, currentProfileId } = await fetchProfiles(tokenOverride);

	if (profiles.length === 0) {
		auth.setProfiles([], null);
		return false;
	}

	const storedProfileId = getActiveProfileId();

	// Priority: 1) localStorage (user's choice), 2) server's currentProfileId, 3) first profile
	let activeProfile = profiles.find((p) => p.id === storedProfileId);

	if (!activeProfile && currentProfileId) {
		activeProfile = profiles.find((p) => p.id === currentProfileId);
	}

	if (!activeProfile) {
		activeProfile = profiles[0];
	}

	// Save to localStorage for future sessions
	setActiveProfileId(activeProfile.id);

	auth.setProfiles(profiles, activeProfile);

	// Return true if user has multiple profiles and should potentially pick one
	return profiles.length > 1 && !storedProfileId;
}

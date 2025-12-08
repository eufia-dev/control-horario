import { writable, derived } from 'svelte/store';
import type { PendingInvitation, JoinRequest, OnboardingStatusType } from '$lib/api/onboarding';

export type UserRole = 'OWNER' | 'ADMIN' | 'WORKER' | 'AUDITOR';

export type AuthUser = {
	id: string;
	name: string;
	email: string;
	companyName: string;
	role: UserRole;
	createdAt: string;
};

export type AuthState = {
	user: AuthUser | null;
	isInitializing: boolean;
	error: string | null;
	// Onboarding state
	onboardingStatus: OnboardingStatusType | null;
	pendingInvitations: PendingInvitation[];
	pendingRequests: JoinRequest[];
};

const createAuthStore = () => {
	const initialState: AuthState = {
		user: null,
		isInitializing: true,
		error: null,
		onboardingStatus: null,
		pendingInvitations: [],
		pendingRequests: []
	};

	const { subscribe, update, set } = writable<AuthState>(initialState);

	return {
		subscribe,
		set,
		update,
		reset: () =>
			set({
				...initialState,
				isInitializing: false
			}),
		setUser: (user: AuthUser) =>
			update((state) => ({
				...state,
				user,
				error: null,
				onboardingStatus: 'ACTIVE'
			})),
		setInitializing: (isInitializing: boolean) =>
			update((state) => ({
				...state,
				isInitializing
			})),
		setError: (error: string | null) =>
			update((state) => ({
				...state,
				error
			})),
		setOnboardingStatus: (
			status: OnboardingStatusType,
			pendingInvitations?: PendingInvitation[],
			pendingRequests?: JoinRequest[]
		) =>
			update((state) => ({
				...state,
				onboardingStatus: status,
				pendingInvitations: pendingInvitations ?? state.pendingInvitations,
				pendingRequests: pendingRequests ?? state.pendingRequests
			})),
		clearOnboarding: () =>
			update((state) => ({
				...state,
				onboardingStatus: null,
				pendingInvitations: [],
				pendingRequests: []
			}))
	};
};

export const auth = createAuthStore();

// True when we have an app user (onboarding completed)
export const isAuthenticated = derived(auth, ($auth) => Boolean($auth.user));

// True when there is a Supabase session or onboarding is in progress
export const isSignedIn = derived(
	auth,
	($auth) =>
		Boolean(
			$auth.user ||
				$auth.onboardingStatus === 'ONBOARDING_REQUIRED' ||
				$auth.onboardingStatus === 'PENDING_APPROVAL'
		)
);

// Returns true for OWNER and ADMIN roles
export const isAdmin = derived(auth, ($auth) => {
	const role = $auth.user?.role;
	return role === 'OWNER' || role === 'ADMIN';
});

// Returns the current onboarding status
export const onboardingStatus = derived(auth, ($auth) => $auth.onboardingStatus);

// Returns true if user needs onboarding
export const needsOnboarding = derived(
	auth,
	($auth) => $auth.onboardingStatus === 'ONBOARDING_REQUIRED'
);

// Returns true if user has pending approval
export const hasPendingApproval = derived(
	auth,
	($auth) => $auth.onboardingStatus === 'PENDING_APPROVAL'
);

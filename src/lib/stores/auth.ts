import { writable, derived } from 'svelte/store';
import type { PendingInvitation, JoinRequest, OnboardingStatusType } from '$lib/api/onboarding';

export type UserRole = 'OWNER' | 'ADMIN' | 'WORKER' | 'AUDITOR';

export type RelationType = 'EMPLOYEE' | 'CONTRACTOR' | 'GUEST';

export type Profile = {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	relation: RelationType;
	company: {
		id: string;
		name: string;
		logoUrl: string | null;
	};
};

export type AuthUser = {
	id: string;
	name: string;
	email: string;
	companyName: string;
	role: UserRole;
	relation: RelationType;
	createdAt: string;
};

export type AuthState = {
	user: AuthUser | null;
	isInitializing: boolean;
	error: string | null;
	onboardingStatus: OnboardingStatusType | null;
	pendingInvitations: PendingInvitation[];
	pendingRequests: JoinRequest[];
	profiles: Profile[];
	activeProfile: Profile | null;
};

const createAuthStore = () => {
	const initialState: AuthState = {
		user: null,
		isInitializing: true,
		error: null,
		onboardingStatus: null,
		pendingInvitations: [],
		pendingRequests: [],
		profiles: [],
		activeProfile: null
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
			})),
		setProfiles: (profiles: Profile[], activeProfile: Profile | null) =>
			update((state) => ({
				...state,
				profiles,
				activeProfile
			})),
		setActiveProfile: (activeProfile: Profile | null) =>
			update((state) => ({
				...state,
				activeProfile
			})),
		clearProfiles: () =>
			update((state) => ({
				...state,
				profiles: [],
				activeProfile: null
			}))
	};
};

export const auth = createAuthStore();

export const isAuthenticated = derived(auth, ($auth) => Boolean($auth.user));

export const isSignedIn = derived(auth, ($auth) =>
	Boolean(
		$auth.user ||
			$auth.onboardingStatus === 'ONBOARDING_REQUIRED' ||
			$auth.onboardingStatus === 'PENDING_APPROVAL'
	)
);

export const isAdmin = derived(auth, ($auth) => {
	const role = $auth.user?.role;
	return role === 'OWNER' || role === 'ADMIN';
});

export const onboardingStatus = derived(auth, ($auth) => $auth.onboardingStatus);

export const needsOnboarding = derived(
	auth,
	($auth) => $auth.onboardingStatus === 'ONBOARDING_REQUIRED'
);

export const hasPendingApproval = derived(
	auth,
	($auth) => $auth.onboardingStatus === 'PENDING_APPROVAL'
);

export const activeProfile = derived(auth, ($auth) => $auth.activeProfile);

export const profiles = derived(auth, ($auth) => $auth.profiles);

export const hasMultipleProfiles = derived(auth, ($auth) => $auth.profiles.length > 1);

export const isGuest = derived(auth, ($auth) => $auth.activeProfile?.relation === 'GUEST');

export const canTrackTime = derived(auth, ($auth) => $auth.activeProfile?.relation !== 'GUEST');

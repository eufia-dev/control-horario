import { writable, derived } from 'svelte/store';

export type AuthUser = {
	id: string;
	name: string;
	email: string;
	organizationName: string;
	mustChangePassword: boolean;
	isAdmin: boolean;
	createdAt: string;
};

export type AuthState = {
	user: AuthUser | null;
	isInitializing: boolean;
	error: string | null;
};

const createAuthStore = () => {
	const initialState: AuthState = {
		user: null,
		isInitializing: true,
		error: null
	};

	const { subscribe, update, set } = writable<AuthState>(initialState);

	return {
		subscribe,
		set,
		update,
		reset: () => set({ ...initialState, isInitializing: false }),
		setUser: (user: AuthUser) =>
			update((state) => ({
				...state,
				user,
				error: null
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
		setMustChangePassword: (mustChangePassword: boolean) =>
			update((state) => ({
				...state,
				user: state.user ? { ...state.user, mustChangePassword } : state.user
			}))
	};
};

export const auth = createAuthStore();

export const isAuthenticated = derived(auth, ($auth) => Boolean($auth.user));

export const mustChangePassword = derived(auth, ($auth) => Boolean($auth.user?.mustChangePassword));

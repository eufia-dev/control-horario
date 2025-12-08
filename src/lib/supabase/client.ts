import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';

const supportsLocalStorage = () =>
	typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const storage = {
	getItem: (key: string) => {
		if (!supportsLocalStorage()) return null;
		return window.localStorage.getItem(key);
	},
	setItem: (key: string, value: string) => {
		if (!supportsLocalStorage()) return;
		window.localStorage.setItem(key, value);
	},
	removeItem: (key: string) => {
		if (!supportsLocalStorage()) return;
		window.localStorage.removeItem(key);
	}
};

export const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
	auth: {
		detectSessionInUrl: true,
		flowType: 'pkce',
		storage
	}
});

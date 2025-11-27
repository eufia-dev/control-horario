import { get } from 'svelte/store';
import { auth, type AuthUser } from '$lib/stores/auth';

const API_BASE = 'http://localhost:3000';

type LoginResponse = {
	user: AuthUser;
};

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

export async function login(email: string, password: string): Promise<AuthUser> {
	auth.setError(null);

	const res = await fetch(`${API_BASE}/auth/login`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		credentials: 'include',
		body: JSON.stringify({ email, password })
	});

	const data = await handleJsonResponse<LoginResponse>(res);

	if (!data.user) {
		throw new Error('Respuesta de inicio de sesión no válida');
	}

	auth.setUser(data.user);
	return data.user;
}

export async function logout(): Promise<void> {
	try {
		await fetch(`${API_BASE}/auth/logout`, {
			method: 'POST',
			credentials: 'include'
		});
	} catch {
		// ignore errors on logout
	} finally {
		auth.reset();
	}
}

export async function refresh(): Promise<void> {
	auth.setInitializing(true);
	auth.setError(null);

	try {
		const res = await fetch(`${API_BASE}/auth/refresh`, {
			method: 'POST',
			credentials: 'include'
		});

		const data = await handleJsonResponse<LoginResponse>(res);

		if (!data.user) {
			throw new Error('Respuesta de actualización no válida');
		}

		auth.setUser(data.user);
	} finally {
		auth.setInitializing(false);
	}
}

export async function resetPassword(currentPassword: string, newPassword: string): Promise<void> {
	const { user } = get(auth);

	if (!user) {
		throw new Error('No estás autenticado');
	}

	const res = await fetch(`${API_BASE}/auth/reset-password`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		credentials: 'include',
		body: JSON.stringify({ currentPassword, newPassword })
	});

	await handleJsonResponse<unknown>(res);

	// On success, mark that the user no longer needs to change password
	auth.setMustChangePassword(false);
}

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
	const response = await fetch(input, {
		...init,
		credentials: 'include'
	});

	if (response.status === 401) {
		// try to refresh once
		try {
			await refresh();

			return fetch(input, {
				...init,
				credentials: 'include'
			});
		} catch {
			await logout();
		}
	}

	return response;
}

export async function initAuthFromRefresh(): Promise<void> {
	const current = get(auth);
	if (current.user) {
		auth.setInitializing(false);
		return;
	}

	try {
		await refresh();
	} catch {
		// Si la actualización falla, simplemente consideramos que no hay sesión
		auth.setInitializing(false);
	}
}

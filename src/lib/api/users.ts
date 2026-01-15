import { PUBLIC_API_URL } from '$env/static/public';
import { fetchWithAuth } from '$lib/auth';
import type { UserRole } from '$lib/stores/auth';
import type { RelationType } from './invitations';

const API_BASE = PUBLIC_API_URL;

export type User = {
	id: string;
	authId: string;
	name: string;
	email: string;
	phone: string | null;
	avatarUrl: string | null;
	salary: number | null;
	hourlyCost: number;
	isActive: boolean;
	relation: RelationType;
	role: UserRole;
	nif: string | null;
	naf: string | null;
	team: { id: string; name: string } | null;
	createdAt: string;
	updatedAt: string | null;
};

export type UpdateUserDto = {
	name: string;
	email?: string;
	phone?: string;
	salary?: number | null;
	hourlyCost?: number;
	isActive?: boolean;
	role?: UserRole;
	relation?: RelationType;
	teamId?: string | null;
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

export async function fetchUsers(): Promise<User[]> {
	const response = await fetchWithAuth(`${API_BASE}/users`);
	return handleJsonResponse<User[]>(response);
}

export async function updateUser(id: string, data: UpdateUserDto): Promise<User> {
	const response = await fetchWithAuth(`${API_BASE}/users/${id}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<User>(response);
}

export async function deleteUser(id: string): Promise<void> {
	const response = await fetchWithAuth(`${API_BASE}/users/${id}`, {
		method: 'DELETE'
	});
	if (!response.ok) {
		const text = await response.text();
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
}

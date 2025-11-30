import { fetchWithAuth } from '$lib/auth';

const API_BASE = 'http://localhost:3000';

// Types
export type User = {
	id: string;
	name: string;
	email: string;
	hourlyCost: number;
	isActive: boolean;
	createdAt: string;
	isAdmin: boolean;
};

export type UpdateUserDto = {
	name: string;
	email: string;
	hourlyCost: number;
	isActive: boolean;
	isAdmin: boolean;
};

// Helper for JSON responses
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

// Users API
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

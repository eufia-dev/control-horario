import { PUBLIC_API_URL } from '$env/static/public';
import { fetchWithAuth } from '$lib/auth';

const API_BASE = PUBLIC_API_URL;

// Types
export type External = {
	id: string;
	name: string;
	hourlyCost: number;
	isActive: boolean;
	createdAt: string;
	organizationId: string;
};

export type CreateExternalDto = {
	name: string;
	hourlyCost: number;
};

export type UpdateExternalDto = {
	name?: string;
	hourlyCost?: number;
	isActive?: boolean;
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

// Externals API
export async function fetchExternals(): Promise<External[]> {
	const response = await fetchWithAuth(`${API_BASE}/externals`);
	return handleJsonResponse<External[]>(response);
}

export async function fetchExternal(id: string): Promise<External> {
	const response = await fetchWithAuth(`${API_BASE}/externals/${id}`);
	return handleJsonResponse<External>(response);
}

export async function createExternal(data: CreateExternalDto): Promise<External> {
	const response = await fetchWithAuth(`${API_BASE}/externals`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<External>(response);
}

export async function updateExternal(id: string, data: UpdateExternalDto): Promise<External> {
	const response = await fetchWithAuth(`${API_BASE}/externals/${id}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<External>(response);
}

export async function deleteExternal(id: string): Promise<void> {
	const response = await fetchWithAuth(`${API_BASE}/externals/${id}`, {
		method: 'DELETE'
	});
	await handleJsonResponse<unknown>(response);
}


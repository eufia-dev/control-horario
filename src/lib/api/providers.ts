import { PUBLIC_API_URL } from '$env/static/public';
import { fetchWithAuth } from '$lib/auth';

const API_BASE = PUBLIC_API_URL;

// ==================== Types ====================

export type Provider = {
	id: string;
	name: string;
	paymentPeriod: number; // in days
	createdAt: string;
};

export type ProviderInfo = {
	id: string;
	name: string;
	paymentPeriod: number;
};

// ==================== DTOs ====================

export type CreateProviderDto = {
	name: string;
	paymentPeriod: number;
};

export type UpdateProviderDto = {
	name?: string;
	paymentPeriod?: number;
};

// ==================== Helper ====================

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

// ==================== Provider API ====================

export async function fetchProviders(): Promise<Provider[]> {
	const response = await fetchWithAuth(`${API_BASE}/providers`);
	return handleJsonResponse<Provider[]>(response);
}

export async function fetchProvider(id: string): Promise<Provider> {
	const response = await fetchWithAuth(`${API_BASE}/providers/${id}`);
	return handleJsonResponse<Provider>(response);
}

export async function createProvider(data: CreateProviderDto): Promise<Provider> {
	const response = await fetchWithAuth(`${API_BASE}/providers`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<Provider>(response);
}

export async function updateProvider(id: string, data: UpdateProviderDto): Promise<Provider> {
	const response = await fetchWithAuth(`${API_BASE}/providers/${id}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<Provider>(response);
}

export async function deleteProvider(id: string): Promise<void> {
	const response = await fetchWithAuth(`${API_BASE}/providers/${id}`, {
		method: 'DELETE'
	});
	await handleJsonResponse<unknown>(response);
}

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
	companyId: string;
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

// External Hours Types
export type ExternalHours = {
	id: string;
	externalId: string;
	projectId: string;
	companyId: string;
	date: string;
	minutes: number;
	createdAt: string;
	// Populated fields for display
	external?: External;
	project?: { id: string; name: string };
};

export type CreateExternalHoursDto = {
	projectId: string;
	date: string;
	minutes: number;
};

export type UpdateExternalHoursDto = {
	projectId?: string;
	date?: string;
	minutes?: number;
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

// External Hours API

export async function fetchExternalHours(externalId: string): Promise<ExternalHours[]> {
	const response = await fetchWithAuth(`${API_BASE}/externals/${externalId}/hours`);
	return handleJsonResponse<ExternalHours[]>(response);
}

export async function fetchAllExternalHours(): Promise<ExternalHours[]> {
	// Fetch all externals first, then fetch hours for each and combine
	const externals = await fetchExternals();
	const allHours: ExternalHours[] = [];

	for (const external of externals) {
		try {
			const hours = await fetchExternalHours(external.id);
			// Attach external info to each hours entry
			allHours.push(...hours.map((h) => ({ ...h, external })));
		} catch {
			// Skip if no hours found for this external
		}
	}

	// Sort by date descending
	return allHours.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function createExternalHours(
	externalId: string,
	data: CreateExternalHoursDto
): Promise<ExternalHours> {
	const response = await fetchWithAuth(`${API_BASE}/externals/${externalId}/hours`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<ExternalHours>(response);
}

export async function updateExternalHours(
	externalId: string,
	hoursId: string,
	data: UpdateExternalHoursDto
): Promise<ExternalHours> {
	const response = await fetchWithAuth(`${API_BASE}/externals/${externalId}/hours/${hoursId}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<ExternalHours>(response);
}

export async function deleteExternalHours(externalId: string, hoursId: string): Promise<void> {
	const response = await fetchWithAuth(`${API_BASE}/externals/${externalId}/hours/${hoursId}`, {
		method: 'DELETE'
	});
	await handleJsonResponse<unknown>(response);
}

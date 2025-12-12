import { PUBLIC_API_URL } from '$env/static/public';
import { fetchWithAuth } from '$lib/auth';

const API_BASE = PUBLIC_API_URL;

// Types
export type Company = {
	id: string;
	name: string;
	code: string;
	allowUserEditSchedule: boolean;
	createdAt: string;
	updatedAt: string | null;
};

export type UpdateCompanySettingsDto = {
	allowUserEditSchedule?: boolean;
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

/**
 * Get my company (any authenticated user)
 */
export async function fetchMyCompany(): Promise<Company> {
	const response = await fetchWithAuth(`${API_BASE}/companies/me`);
	return handleJsonResponse<Company>(response);
}

/**
 * Update company settings (admin only)
 */
export async function updateCompanySettings(dto: UpdateCompanySettingsDto): Promise<Company> {
	const response = await fetchWithAuth(`${API_BASE}/companies/settings`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(dto)
	});
	return handleJsonResponse<Company>(response);
}


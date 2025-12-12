import { PUBLIC_API_URL } from '$env/static/public';
import { fetchWithAuth } from '$lib/auth';

const API_BASE = PUBLIC_API_URL;

// Types
export type LocationResponse = {
	id: string;
	regionCode: string;
	provinceCode: string | null;
	municipalityName: string | null;
	address: string | null;
	postalCode: string | null;
	timezone: string;
};

export type UpdateLocationDto = {
	regionCode: string;
	provinceCode: string;
	municipalityName: string;
	address: string;
	postalCode: string;
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

	return text ? (JSON.parse(text) as T) : (null as T);
}

/**
 * Get company location
 */
export async function fetchCompanyLocation(): Promise<LocationResponse> {
	const response = await fetchWithAuth(`${API_BASE}/companies/location`);
	return handleJsonResponse<LocationResponse>(response);
}

/**
 * Update company location (Admin only)
 * Note: If regionCode changes, holidays are automatically re-synced for the new region
 */
export async function updateCompanyLocation(data: UpdateLocationDto): Promise<LocationResponse> {
	const response = await fetchWithAuth(`${API_BASE}/companies/location`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<LocationResponse>(response);
}

/**
 * Fetch municipalities for a given province code
 */
export async function fetchMunicipalities(provinceCode: string): Promise<string[]> {
	const response = await fetchWithAuth(
		`${API_BASE}/locations/municipalities?provinceCode=${encodeURIComponent(provinceCode)}`
	);
	return handleJsonResponse<string[]>(response);
}

import { PUBLIC_API_URL } from '$env/static/public';
import { fetchWithAuth } from '$lib/auth';

const API_BASE = PUBLIC_API_URL;

// Types
export type SpainRegion = {
	code: string;
	name: string;
};

export type HolidaySource = 'API' | 'MANUAL';

export type HolidayResponse = {
	id: string;
	date: string;
	name: string;
	localName: string | null;
	type: 'public' | 'company';
	isNational: boolean;
	regionCode: string | null;
	source?: HolidaySource;
};

export type CompanyHolidayResponse = {
	id: string;
	date: string;
	name: string;
	isRecurring: boolean;
	createdAt: string;
};

export type CreateCompanyHolidayDto = {
	date: string;
	name: string;
	isRecurring?: boolean;
};

export type SyncHolidaysResponse = {
	success: boolean;
	results: Array<{
		year: number;
		holidaysAdded: number;
		holidaysUpdated: number;
	}>;
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
 * Get list of Spanish autonomous communities for dropdown selection
 */
export async function fetchRegions(): Promise<SpainRegion[]> {
	const response = await fetchWithAuth(`${API_BASE}/holidays/regions`);
	return handleJsonResponse<SpainRegion[]>(response);
}

/**
 * Get all holidays (public + company custom) for a year
 */
export async function fetchHolidays(year: number): Promise<HolidayResponse[]> {
	const response = await fetchWithAuth(`${API_BASE}/holidays?year=${year}`);
	return handleJsonResponse<HolidayResponse[]>(response);
}

/**
 * Get only custom company holidays
 */
export async function fetchCompanyHolidays(): Promise<CompanyHolidayResponse[]> {
	const response = await fetchWithAuth(`${API_BASE}/holidays/company`);
	return handleJsonResponse<CompanyHolidayResponse[]>(response);
}

/**
 * Add a custom company holiday (Admin only)
 */
export async function createCompanyHoliday(
	data: CreateCompanyHolidayDto
): Promise<CompanyHolidayResponse> {
	const response = await fetchWithAuth(`${API_BASE}/holidays`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<CompanyHolidayResponse>(response);
}

/**
 * Remove a custom company holiday (Admin only)
 */
export async function deleteCompanyHoliday(id: string): Promise<CompanyHolidayResponse> {
	const response = await fetchWithAuth(`${API_BASE}/holidays/${id}`, {
		method: 'DELETE'
	});
	return handleJsonResponse<CompanyHolidayResponse>(response);
}

/**
 * Manually trigger holiday sync from Nager.Date API (Admin only)
 */
export async function syncHolidays(year: number): Promise<SyncHolidaysResponse> {
	const response = await fetchWithAuth(`${API_BASE}/holidays/sync?year=${year}`, {
		method: 'POST'
	});
	return handleJsonResponse<SyncHolidaysResponse>(response);
}

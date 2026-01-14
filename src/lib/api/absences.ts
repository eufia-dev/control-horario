import { PUBLIC_API_URL } from '$env/static/public';
import { fetchWithAuth } from '$lib/auth';

const API_BASE = PUBLIC_API_URL;

// Types
export type AbsenceType =
	| 'VACATION'
	| 'SICK_LEAVE_COMMON'
	| 'SICK_LEAVE_PROFESSIONAL'
	| 'ACCIDENT_LEAVE_NON_WORK'
	| 'ACCIDENT_LEAVE_WORK'
	| 'PARENTAL_LEAVE'
	| 'NURSING_LEAVE'
	| 'MARRIAGE'
	| 'MOVING'
	| 'FAMILY_BEREAVEMENT_HOSPITALIZATION'
	| 'TRAINING'
	| 'OTHER';

export type AbsenceStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type AbsenceTypeOption = {
	value: AbsenceType;
	name: string;
};

export type AbsenceResponse = {
	id: string;
	userId: string;
	companyId: string;
	startDate: string;
	endDate: string;
	type: AbsenceType;
	workdaysCount: number;
	status: AbsenceStatus;
	notes: string | null;
	reviewedById: string | null;
	reviewedAt: string | null;
	createdAt: string;
	user?: {
		id: string;
		name: string;
		email: string;
	};
	reviewedBy?: {
		id: string;
		name: string;
	} | null;
};

export type AbsenceStats = {
	pending: number;
	approved: number;
	rejected: number;
	cancelled: number;
};

export type CreateAbsenceDto = {
	startDate: string;
	endDate: string;
	type: AbsenceType;
	notes?: string;
};

export type ReviewAbsenceDto = {
	status: 'APPROVED' | 'REJECTED';
	notes?: string;
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
 * Get absence type enum values for dropdown
 */
export async function fetchAbsenceTypes(): Promise<AbsenceTypeOption[]> {
	const response = await fetchWithAuth(`${API_BASE}/absences/types`);
	return handleJsonResponse<AbsenceTypeOption[]>(response);
}

/**
 * Get current user's absences
 */
export async function fetchMyAbsences(status?: AbsenceStatus): Promise<AbsenceResponse[]> {
	const params = new URLSearchParams();
	if (status) params.set('status', status);
	const query = params.toString();
	const response = await fetchWithAuth(`${API_BASE}/absences/me${query ? `?${query}` : ''}`);
	return handleJsonResponse<AbsenceResponse[]>(response);
}

/**
 * Request a new absence
 */
export async function createAbsence(data: CreateAbsenceDto): Promise<AbsenceResponse> {
	const response = await fetchWithAuth(`${API_BASE}/absences`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<AbsenceResponse>(response);
}

/**
 * Cancel an absence (admin can cancel any, users can cancel their own)
 */
export async function cancelAbsence(id: string): Promise<AbsenceResponse> {
	const response = await fetchWithAuth(`${API_BASE}/absences/${id}`, {
		method: 'DELETE'
	});
	return handleJsonResponse<AbsenceResponse>(response);
}

/**
 * Get all company absences (Admin only)
 */
export async function fetchAllAbsences(
	status?: AbsenceStatus,
	userId?: string
): Promise<AbsenceResponse[]> {
	const params = new URLSearchParams();
	if (status) params.set('status', status);
	if (userId) params.set('userId', userId);
	const query = params.toString();
	const response = await fetchWithAuth(`${API_BASE}/absences${query ? `?${query}` : ''}`);
	return handleJsonResponse<AbsenceResponse[]>(response);
}

/**
 * Get single absence by ID (Admin only)
 */
export async function fetchAbsence(id: string): Promise<AbsenceResponse> {
	const response = await fetchWithAuth(`${API_BASE}/absences/${id}`);
	return handleJsonResponse<AbsenceResponse>(response);
}

/**
 * Approve or reject an absence request (Admin only)
 */
export async function reviewAbsence(id: string, data: ReviewAbsenceDto): Promise<AbsenceResponse> {
	const response = await fetchWithAuth(`${API_BASE}/absences/${id}/review`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<AbsenceResponse>(response);
}

/**
 * Get absence statistics for the company (Admin only)
 */
export async function fetchAbsenceStats(): Promise<AbsenceStats> {
	const response = await fetchWithAuth(`${API_BASE}/absences/stats`);
	return handleJsonResponse<AbsenceStats>(response);
}

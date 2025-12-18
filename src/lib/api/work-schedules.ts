import { PUBLIC_API_URL } from '$env/static/public';
import { fetchWithAuth } from '$lib/auth';

const API_BASE = PUBLIC_API_URL;

// Types
export type WorkScheduleDay = {
	dayOfWeek: number; // 0 = Monday, 1 = Tuesday, ... 6 = Sunday
	startTime: string; // "HH:mm" 24h format
	endTime: string; // "HH:mm" 24h format
};

export type WorkScheduleResponse = {
	days: WorkScheduleDay[];
};

export type UpdateWorkScheduleDto = {
	days: WorkScheduleDay[];
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
 * Get company default schedule (any authenticated user)
 */
export async function fetchCompanyDefaultSchedule(): Promise<WorkScheduleResponse> {
	const response = await fetchWithAuth(`${API_BASE}/work-schedules/company-default`);
	return handleJsonResponse<WorkScheduleResponse>(response);
}

/**
 * Get my effective schedule (defaults merged with my overrides)
 */
export async function fetchMyEffectiveSchedule(): Promise<WorkScheduleResponse> {
	const response = await fetchWithAuth(`${API_BASE}/work-schedules/me`);
	return handleJsonResponse<WorkScheduleResponse>(response);
}

/**
 * Get effective schedule for a user (admin only)
 */
export async function fetchUserSchedule(userId: string): Promise<WorkScheduleResponse> {
	const response = await fetchWithAuth(`${API_BASE}/work-schedules/users/${userId}`);
	return handleJsonResponse<WorkScheduleResponse>(response);
}

/**
 * Set/replace company default schedule (admin only)
 */
export async function updateCompanyDefaultSchedule(
	dto: UpdateWorkScheduleDto
): Promise<WorkScheduleResponse> {
	const response = await fetchWithAuth(`${API_BASE}/work-schedules/company-default`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(dto)
	});
	return handleJsonResponse<WorkScheduleResponse>(response);
}

/**
 * Set/replace my overrides (user; gated by company flag)
 */
export async function updateMyOverrides(dto: UpdateWorkScheduleDto): Promise<WorkScheduleResponse> {
	const response = await fetchWithAuth(`${API_BASE}/work-schedules/me`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(dto)
	});
	return handleJsonResponse<WorkScheduleResponse>(response);
}

/**
 * Delete all my overrides (user; gated by company flag)
 */
export async function deleteMyOverrides(): Promise<void> {
	const response = await fetchWithAuth(`${API_BASE}/work-schedules/me/overrides`, {
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

/**
 * Set/replace overrides for a user (admin only)
 */
export async function updateUserOverrides(
	userId: string,
	dto: UpdateWorkScheduleDto
): Promise<WorkScheduleResponse> {
	const response = await fetchWithAuth(`${API_BASE}/work-schedules/users/${userId}`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(dto)
	});
	return handleJsonResponse<WorkScheduleResponse>(response);
}

/**
 * Delete all overrides for a user (admin only)
 */
export async function deleteUserOverrides(userId: string): Promise<void> {
	const response = await fetchWithAuth(`${API_BASE}/work-schedules/users/${userId}/overrides`, {
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

// Helper constants for day names
export const DAY_NAMES = [
	'Lunes',
	'Martes',
	'Miércoles',
	'Jueves',
	'Viernes',
	'Sábado',
	'Domingo'
] as const;

/**
 * Validate time format (HH:mm)
 */
export function isValidTimeFormat(time: string): boolean {
	return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}

/**
 * Check if endTime is after startTime
 */
export function isEndTimeAfterStartTime(startTime: string, endTime: string): boolean {
	if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
		return false;
	}
	const [startHour, startMin] = startTime.split(':').map(Number);
	const [endHour, endMin] = endTime.split(':').map(Number);
	const startMinutes = startHour * 60 + startMin;
	const endMinutes = endHour * 60 + endMin;
	return endMinutes > startMinutes;
}

/**
 * Validate a schedule DTO
 */
export function validateSchedule(
	dto: UpdateWorkScheduleDto
): { valid: true } | { valid: false; error: string } {
	const seenDays = new Set<number>();

	for (const day of dto.days) {
		// Check dayOfWeek range
		if (day.dayOfWeek < 0 || day.dayOfWeek > 6) {
			return { valid: false, error: `Día inválido: ${day.dayOfWeek}` };
		}

		// Check for duplicates
		if (seenDays.has(day.dayOfWeek)) {
			return { valid: false, error: `Día duplicado: ${DAY_NAMES[day.dayOfWeek]}` };
		}
		seenDays.add(day.dayOfWeek);

		// Validate time formats
		if (!isValidTimeFormat(day.startTime)) {
			return {
				valid: false,
				error: `Hora de inicio inválida para ${DAY_NAMES[day.dayOfWeek]}: ${day.startTime}`
			};
		}
		if (!isValidTimeFormat(day.endTime)) {
			return {
				valid: false,
				error: `Hora de fin inválida para ${DAY_NAMES[day.dayOfWeek]}: ${day.endTime}`
			};
		}

		// Check endTime > startTime
		if (!isEndTimeAfterStartTime(day.startTime, day.endTime)) {
			return {
				valid: false,
				error: `La hora de fin debe ser posterior a la de inicio para ${DAY_NAMES[day.dayOfWeek]}`
			};
		}
	}

	return { valid: true };
}

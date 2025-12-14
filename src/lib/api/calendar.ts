import { PUBLIC_API_URL } from '$env/static/public';
import { fetchWithAuth } from '$lib/auth';
import type { AbsenceType } from './absences';

const API_BASE = PUBLIC_API_URL;

// Types
export type DayStatus =
	| 'PUBLIC_HOLIDAY'
	| 'COMPANY_HOLIDAY'
	| 'ABSENCE'
	| 'NON_WORKING_DAY'
	| 'WORKED'
	| 'PARTIALLY_WORKED'
	| 'MISSING_LOGS'
	| 'BEFORE_USER_CREATED'
	| 'FUTURE';

export type EntryType = 'WORK' | 'PAUSE_COFFEE' | 'PAUSE_LUNCH' | 'PAUSE_PERSONAL';

export type TimeEntryBrief = {
	id: string;
	startTime: string;
	endTime: string;
	durationMinutes: number;
	entryType: EntryType;
	projectId: string | null;
	projectName: string | null;
};

export type CalendarDay = {
	date: string;
	dayOfWeek: number;
	status: DayStatus;
	holidayName?: string;
	absenceType?: AbsenceType;
	expectedMinutes: number;
	loggedMinutes: number;
	entries: TimeEntryBrief[];
	isOvertime?: boolean;
};

export type CalendarSummary = {
	workingDays: number;
	daysWorked: number;
	daysMissing: number;
	publicHolidays: number;
	absenceDays: number;
	totalExpectedMinutes: number;
	totalLoggedMinutes: number;
	compliancePercentage: number;
};

export type CalendarResponse = {
	userId: string;
	userName: string;
	from: string;
	to: string;
	days: CalendarDay[];
	summary: CalendarSummary;
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
 * Get calendar with computed day statuses
 */
export async function fetchCalendar(
	from: string,
	to: string,
	userId?: string
): Promise<CalendarResponse> {
	const params = new URLSearchParams();
	params.set('from', from);
	params.set('to', to);
	if (userId) params.set('userId', userId);
	const response = await fetchWithAuth(`${API_BASE}/calendar?${params.toString()}`);
	return handleJsonResponse<CalendarResponse>(response);
}

/**
 * Shortcut for current user's calendar
 */
export async function fetchMyCalendar(from: string, to: string): Promise<CalendarResponse> {
	const params = new URLSearchParams();
	params.set('from', from);
	params.set('to', to);
	const response = await fetchWithAuth(`${API_BASE}/calendar/me?${params.toString()}`);
	return handleJsonResponse<CalendarResponse>(response);
}

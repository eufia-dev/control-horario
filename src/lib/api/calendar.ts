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
	isOutsideMonth?: boolean; // true for padding days from previous/next month
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

/** @deprecated Use CalendarMonthResponse instead */
export type CalendarResponse = {
	userId: string;
	userName: string;
	from: string;
	to: string;
	days: CalendarDay[];
	summary: CalendarSummary;
};

export type CalendarMonthResponse = {
	userId: string;
	userName: string;
	year: number;
	month: number; // 0-indexed (0 = January, 11 = December)
	from: string; // Display range start (YYYY-MM-DD), includes padding days
	to: string; // Display range end (YYYY-MM-DD), includes padding days
	days: CalendarDay[]; // All days including padding from adjacent months
	summary: CalendarSummary; // Only calculated for days within the target month
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
 * Get calendar month for the current user
 * @param year Year (2000-2100)
 * @param month Month, 0-indexed (0 = January, 11 = December)
 */
export async function fetchMyCalendarMonth(
	year: number,
	month: number
): Promise<CalendarMonthResponse> {
	const params = new URLSearchParams();
	params.set('year', String(year));
	params.set('month', String(month));
	const response = await fetchWithAuth(`${API_BASE}/calendar/me/month?${params.toString()}`);
	return handleJsonResponse<CalendarMonthResponse>(response);
}

/**
 * Get calendar month for a specific user (admin only)
 * @param year Year (2000-2100)
 * @param month Month, 0-indexed (0 = January, 11 = December)
 * @param userId User ID (UUID)
 */
export async function fetchCalendarMonth(
	year: number,
	month: number,
	userId: string
): Promise<CalendarMonthResponse> {
	const params = new URLSearchParams();
	params.set('year', String(year));
	params.set('month', String(month));
	params.set('userId', userId);
	const response = await fetchWithAuth(`${API_BASE}/calendar/month?${params.toString()}`);
	return handleJsonResponse<CalendarMonthResponse>(response);
}

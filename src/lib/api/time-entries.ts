import { PUBLIC_API_URL } from '$env/static/public';
import { fetchWithAuth } from '$lib/auth';

const API_BASE = PUBLIC_API_URL;

export type TimeEntryType = {
	value: string;
	name: string;
};

export type TimeEntry = {
	id: string;
	userId: string;
	projectId: string;
	companyId: string;
	entryType: string;
	startTime: string;
	endTime: string;
	durationMinutes: number;
	isInOffice: boolean;
	createdAt: string;
	source?: string;
	isManual?: boolean;
	isModified?: boolean;
	comment?: string | null;
	user?: {
		id: string;
		name: string;
		email: string;
	};
	project?: {
		id: string;
		name: string;
		code: string;
	};
	company?: {
		id: string;
		name: string;
	};
	timeEntryType?: {
		value: string;
		name: string;
	};
	entryTypeName?: string;
};

export type ActiveTimer = {
	id: string;
	userId: string;
	projectId: string;
	companyId: string;
	entryType: string;
	startTime: string;
	isInOffice: boolean;
	comment?: string | null;
	createdAt: string;
	user?: {
		id: string;
		name: string;
		email: string;
	};
	project?: {
		id: string;
		name: string;
		code: string;
	};
	company?: {
		id: string;
		name: string;
	};
	timeEntryType?: {
		value: string;
		name: string;
	};
	entryTypeName?: string;
};

export type EntrySource = 'WEB' | 'APP' | 'WHATSAPP';

export type CreateTimeEntryDto = {
	projectId?: string;
	entryType: string;
	startTime: string;
	endTime: string;
	durationMinutes: number;
	isInOffice?: boolean;
	comment?: string | null;
	source?: EntrySource;
};

export type UpdateTimeEntryDto = {
	projectId?: string;
	entryType?: string;
	startTime?: string;
	endTime?: string;
	durationMinutes?: number;
	isInOffice?: boolean;
	comment?: string | null;
};

export type StartTimerDto = {
	projectId?: string;
	entryType: string;
	isInOffice?: boolean;
	comment?: string | null;
};

export type StopTimerDto = {
	source?: EntrySource;
};

export type SwitchTimerDto = {
	projectId?: string;
	entryType: string;
	isInOffice?: boolean;
	comment?: string | null;
	source?: EntrySource;
};

export type SwitchTimerResponse = {
	stoppedEntry: TimeEntry;
	activeTimer: ActiveTimer;
};

export type SaveDaySegment = {
	id?: string;
	entryType: string;
	projectId?: string;
	startTime: string;
	endTime: string;
	durationMinutes: number;
	isInOffice?: boolean;
	comment?: string | null;
};

export type SaveDayDto = {
	date: string;
	segments: SaveDaySegment[];
	reason?: string;
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

export async function fetchTimeEntryTypes(): Promise<TimeEntryType[]> {
	const response = await fetchWithAuth(`${API_BASE}/time-entries/types`);
	return handleJsonResponse<TimeEntryType[]>(response);
}

export async function fetchMyTimeEntries(year?: number, month?: number): Promise<TimeEntry[]> {
	const params = new URLSearchParams();
	if (year !== undefined) params.append('year', year.toString());
	if (month !== undefined) params.append('month', month.toString());
	const query = params.toString();
	const url = `${API_BASE}/time-entries/me${query ? `?${query}` : ''}`;
	const response = await fetchWithAuth(url);
	return handleJsonResponse<TimeEntry[]>(response);
}

export async function fetchTimeEntriesByDate(date: string): Promise<TimeEntry[]> {
	const url = `${API_BASE}/time-entries/me/by-date?date=${encodeURIComponent(date)}`;
	const response = await fetchWithAuth(url);
	return handleJsonResponse<TimeEntry[]>(response);
}

export async function fetchUserTimeEntries(
	userId: string,
	year?: number,
	month?: number
): Promise<TimeEntry[]> {
	const params = new URLSearchParams();
	params.append('userId', userId);
	if (year !== undefined) params.append('year', year.toString());
	if (month !== undefined) params.append('month', month.toString());
	const url = `${API_BASE}/time-entries?${params.toString()}`;
	const response = await fetchWithAuth(url);
	return handleJsonResponse<TimeEntry[]>(response);
}

export async function createTimeEntry(data: CreateTimeEntryDto): Promise<TimeEntry> {
	const response = await fetchWithAuth(`${API_BASE}/time-entries/me`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<TimeEntry>(response);
}

export async function updateTimeEntry(id: string, data: UpdateTimeEntryDto): Promise<TimeEntry> {
	const response = await fetchWithAuth(`${API_BASE}/time-entries/me/${id}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<TimeEntry>(response);
}

export async function deleteTimeEntry(id: string): Promise<void> {
	const response = await fetchWithAuth(`${API_BASE}/time-entries/me/${id}`, {
		method: 'DELETE'
	});
	await handleJsonResponse<unknown>(response);
}

export async function saveDayEntries(data: SaveDayDto): Promise<TimeEntry[]> {
	const response = await fetchWithAuth(`${API_BASE}/time-entries/me/save-day`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<TimeEntry[]>(response);
}

export async function getActiveTimer(): Promise<ActiveTimer | null> {
	const response = await fetchWithAuth(`${API_BASE}/time-entries/me/timer`);
	return handleJsonResponse<ActiveTimer | null>(response);
}

export async function startTimer(data: StartTimerDto): Promise<ActiveTimer> {
	const response = await fetchWithAuth(`${API_BASE}/time-entries/me/timer/start`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<ActiveTimer>(response);
}

export async function stopTimer(data?: StopTimerDto): Promise<TimeEntry> {
	const response = await fetchWithAuth(`${API_BASE}/time-entries/me/timer/stop`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data ?? {})
	});
	return handleJsonResponse<TimeEntry>(response);
}

export async function switchTimer(data: SwitchTimerDto): Promise<SwitchTimerResponse> {
	const response = await fetchWithAuth(`${API_BASE}/time-entries/me/timer/switch`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<SwitchTimerResponse>(response);
}

export async function cancelTimer(): Promise<ActiveTimer> {
	const response = await fetchWithAuth(`${API_BASE}/time-entries/me/timer`, {
		method: 'DELETE'
	});
	return handleJsonResponse<ActiveTimer>(response);
}

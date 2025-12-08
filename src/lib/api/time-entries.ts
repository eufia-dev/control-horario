import { PUBLIC_API_URL } from '$env/static/public';
import { fetchWithAuth } from '$lib/auth';

const API_BASE = PUBLIC_API_URL;

export type TimeEntryType = {
	id: string;
	name: string;
};

export type TimeEntry = {
	id: string;
	userId: string;
	projectId: string;
	companyId: string;
	typeId: string;
	startedAt: string;
	endedAt: string;
	minutes: number;
	isOffice: boolean;
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
		id: string;
		name: string;
	};
};

export type ActiveTimer = {
	id: string;
	userId: string;
	projectId: string;
	companyId: string;
	typeId: string;
	startedAt: string;
	isOffice: boolean;
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
		id: string;
		name: string;
	};
};

export type CreateTimeEntryDto = {
	projectId: string;
	typeId: string;
	startedAt: string;
	endedAt: string;
	minutes: number;
	isOffice?: boolean;
};

export type UpdateTimeEntryDto = {
	projectId?: string;
	typeId?: string;
	startedAt?: string;
	endedAt?: string;
	minutes?: number;
	isOffice?: boolean;
};

export type StartTimerDto = {
	projectId: string;
	typeId: string;
	isOffice?: boolean;
};

export type SwitchTimerDto = {
	projectId: string;
	typeId: string;
	isOffice?: boolean;
};

export type SwitchTimerResponse = {
	stoppedEntry: TimeEntry;
	activeTimer: ActiveTimer;
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

export async function fetchMyTimeEntries(): Promise<TimeEntry[]> {
	const response = await fetchWithAuth(`${API_BASE}/time-entries/me`);
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

export async function stopTimer(): Promise<TimeEntry> {
	const response = await fetchWithAuth(`${API_BASE}/time-entries/me/timer/stop`, {
		method: 'POST'
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

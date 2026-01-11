import { PUBLIC_API_URL } from '$env/static/public';
import { fetchWithAuth } from '$lib/auth';
import type { UserRole } from '$lib/stores/auth';

const API_BASE = PUBLIC_API_URL;

export type TeamLeader = {
	id: string;
	name: string;
};

export type Team = {
	id: string;
	name: string;
	memberCount: number;
	leaders: TeamLeader[];
	createdAt: string;
};

export type TeamMember = {
	id: string;
	name: string;
	email: string;
	role: UserRole;
};

export type TeamDetail = Team & {
	members: TeamMember[];
};

export type CreateTeamDto = {
	name: string;
	leaderIds?: string[];
	memberIds?: string[];
};

export type UpdateTeamDto = {
	name: string;
	leaderIds?: string[];
	memberIds?: string[];
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

export async function fetchTeams(): Promise<Team[]> {
	const response = await fetchWithAuth(`${API_BASE}/teams`);
	return handleJsonResponse<Team[]>(response);
}

export async function fetchTeam(id: string): Promise<TeamDetail> {
	const response = await fetchWithAuth(`${API_BASE}/teams/${id}`);
	return handleJsonResponse<TeamDetail>(response);
}

export async function createTeam(data: CreateTeamDto): Promise<Team> {
	const response = await fetchWithAuth(`${API_BASE}/teams`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<Team>(response);
}

export async function updateTeam(id: string, data: UpdateTeamDto): Promise<Team> {
	const response = await fetchWithAuth(`${API_BASE}/teams/${id}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<Team>(response);
}

export async function updateMyTeam(data: UpdateTeamDto): Promise<Team> {
	const response = await fetchWithAuth(`${API_BASE}/teams/my-team`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<Team>(response);
}

export async function deleteTeam(id: string): Promise<void> {
	const response = await fetchWithAuth(`${API_BASE}/teams/${id}`, {
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

export async function addTeamMember(teamId: string, userId: string): Promise<void> {
	const response = await fetchWithAuth(`${API_BASE}/teams/${teamId}/members`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ userId })
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

export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
	const response = await fetchWithAuth(`${API_BASE}/teams/${teamId}/members/${userId}`, {
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

export async function addMyTeamMember(userId: string): Promise<void> {
	const response = await fetchWithAuth(`${API_BASE}/teams/my-team/members`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ userId })
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

export async function removeMyTeamMember(userId: string): Promise<void> {
	const response = await fetchWithAuth(`${API_BASE}/teams/my-team/members/${userId}`, {
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

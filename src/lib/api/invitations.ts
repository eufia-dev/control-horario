import { PUBLIC_API_URL } from '$env/static/public';
import { fetchWithAuth } from '$lib/auth';
import type { UserRole } from '$lib/stores/auth';
import type { JoinRequestStatus } from './onboarding';

const API_BASE = PUBLIC_API_URL;

export type Invitation = {
	id: string;
	companyId: string;
	email: string;
	role: UserRole;
	token: string;
	expiresAt: string;
	usedAt?: string;
	createdAt: string;
};

export type CreateInvitationDto = {
	email: string;
	role: UserRole;
};

export type AdminJoinRequest = {
	id: string;
	companyId: string;
	authId: string;
	email: string;
	name: string;
	status: JoinRequestStatus;
	createdAt: string;
	reviewedAt?: string;
	reviewedById?: string;
};

export type ApproveJoinRequestDto = {
	role?: UserRole;
};

export type RejectJoinRequestDto = {
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

	return text ? (JSON.parse(text) as T) : ({} as T);
}

export async function fetchInvitations(): Promise<Invitation[]> {
	const response = await fetchWithAuth(`${API_BASE}/invitations`);
	return handleJsonResponse<Invitation[]>(response);
}

export async function createInvitation(data: CreateInvitationDto): Promise<Invitation> {
	const response = await fetchWithAuth(`${API_BASE}/invitations`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<Invitation>(response);
}

export async function deleteInvitation(id: string): Promise<void> {
	const response = await fetchWithAuth(`${API_BASE}/invitations/${id}`, {
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

export async function fetchJoinRequests(): Promise<AdminJoinRequest[]> {
	const response = await fetchWithAuth(`${API_BASE}/join-requests`);
	return handleJsonResponse<AdminJoinRequest[]>(response);
}

export async function approveJoinRequest(
	id: string,
	data?: ApproveJoinRequestDto
): Promise<AdminJoinRequest> {
	const response = await fetchWithAuth(`${API_BASE}/join-requests/${id}/approve`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data ?? {})
	});
	return handleJsonResponse<AdminJoinRequest>(response);
}

export async function rejectJoinRequest(
	id: string,
	data?: RejectJoinRequestDto
): Promise<AdminJoinRequest> {
	const response = await fetchWithAuth(`${API_BASE}/join-requests/${id}/reject`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data ?? {})
	});
	return handleJsonResponse<AdminJoinRequest>(response);
}

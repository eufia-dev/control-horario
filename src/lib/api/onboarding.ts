import { PUBLIC_API_URL } from '$env/static/public';
import { fetchWithAuth } from '$lib/auth';
import type { UserRole, RelationType } from '$lib/stores/auth';

const API_BASE = PUBLIC_API_URL;

export type OnboardingStatusType = 'ACTIVE' | 'ONBOARDING_REQUIRED' | 'PENDING_APPROVAL';

export type PendingInvitation = {
	id: string;
	companyId: string;
	companyName: string;
	email: string;
	role: UserRole;
	token: string;
	expiresAt: string;
};

export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type JoinRequest = {
	id: string;
	companyId: string;
	companyName: string;
	email: string;
	name: string;
	status: JoinRequestStatus;
	createdAt: string;
	reviewedAt?: string;
};

export type OnboardingCheckResponse = {
	status: OnboardingStatusType;
	user?: {
		id: string;
		name: string;
		email: string;
		companyName: string;
		role: UserRole;
		relation: RelationType;
		teamId: string | null;
		createdAt: string;
	};
	pendingInvitations?: PendingInvitation[];
	requests?: JoinRequest[];
};

export type CompanySearchResult = {
	id: string;
	name: string;
	inviteCode?: string;
};

export type CreateCompanyDto = {
	companyName: string;
	cif?: string;
	userName: string;
	// Location fields (all required)
	regionCode: string;
	provinceCode: string;
	municipalityName: string;
	address: string;
	postalCode: string;
	// Feature flags
	hasProjectsFeature?: boolean;
	hasCommentsFeature?: boolean;
};

export type RequestJoinDto = {
	companyId: string;
	name: string;
};

export type RequestJoinByCodeDto = {
	inviteCode: string;
};

export type RequestJoinByCodeResponse = {
	companyName: string;
	status: 'PENDING';
};

// Pending invitation for logged-in users (different from onboarding PendingInvitation)
export type AuthPendingInvitation = {
	id: string;
	token: string;
	role: UserRole;
	relation: RelationType;
	expiresAt: string;
	company: {
		id: string;
		name: string;
		logoUrl: string | null;
	};
};

export type AcceptInvitationResponse = {
	profile: {
		id: string;
		name: string;
		email: string;
		role: UserRole;
		relation: RelationType;
		company: {
			id: string;
			name: string;
			logoUrl: string | null;
		};
	};
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

export async function checkOnboardingStatus(
	tokenOverride?: string
): Promise<OnboardingCheckResponse> {
	const response = await fetchWithAuth(
		`${API_BASE}/onboarding/check`,
		{
			method: 'POST'
		},
		tokenOverride
	);
	return handleJsonResponse<OnboardingCheckResponse>(response);
}

export async function createCompany(data: CreateCompanyDto): Promise<OnboardingCheckResponse> {
	const response = await fetchWithAuth(`${API_BASE}/onboarding/create-company`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<OnboardingCheckResponse>(response);
}

export async function acceptInvitation(
	token: string,
	userName: string
): Promise<OnboardingCheckResponse> {
	const response = await fetchWithAuth(`${API_BASE}/onboarding/accept-invitation/${token}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ userName })
	});

	return handleJsonResponse<OnboardingCheckResponse>(response);
}

export async function requestJoin(data: RequestJoinDto): Promise<JoinRequest> {
	const response = await fetchWithAuth(`${API_BASE}/onboarding/request-join`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<JoinRequest>(response);
}

export async function getMyRequests(): Promise<JoinRequest[]> {
	const response = await fetchWithAuth(`${API_BASE}/onboarding/my-requests`);
	return handleJsonResponse<JoinRequest[]>(response);
}

export async function cancelJoinRequest(requestId: string): Promise<void> {
	const response = await fetchWithAuth(`${API_BASE}/onboarding/my-requests/${requestId}`, {
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

export async function searchCompanies(query: string): Promise<CompanySearchResult[]> {
	const response = await fetchWithAuth(
		`${API_BASE}/companies/search?q=${encodeURIComponent(query)}`
	);
	return handleJsonResponse<CompanySearchResult[]>(response);
}

export async function getCompanyByCode(code: string): Promise<CompanySearchResult> {
	const response = await fetchWithAuth(`${API_BASE}/companies/by-code/${encodeURIComponent(code)}`);
	return handleJsonResponse<CompanySearchResult>(response);
}

// ==================== Multi-tenancy API functions ====================

/**
 * Get pending invitations for the logged-in user
 * Returns invitations for companies the user is not already a member of
 */
export async function fetchAuthPendingInvitations(): Promise<AuthPendingInvitation[]> {
	const response = await fetchWithAuth(`${API_BASE}/auth/pending-invitations`);
	const data = await handleJsonResponse<{ invitations: AuthPendingInvitation[] }>(response);
	return data.invitations;
}

/**
 * Accept an invitation as a logged-in user (no userName needed)
 * This creates a new profile for the user in the invited company
 */
export async function acceptInvitationAsUser(token: string): Promise<AcceptInvitationResponse> {
	const response = await fetchWithAuth(`${API_BASE}/auth/accept-invitation/${token}`, {
		method: 'POST'
	});
	return handleJsonResponse<AcceptInvitationResponse>(response);
}

/**
 * Request to join a company using an invite code
 * The request will be pending until approved by an admin
 */
export async function requestJoinByCode(inviteCode: string): Promise<RequestJoinByCodeResponse> {
	const response = await fetchWithAuth(`${API_BASE}/auth/request-join`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ inviteCode })
	});
	return handleJsonResponse<RequestJoinByCodeResponse>(response);
}

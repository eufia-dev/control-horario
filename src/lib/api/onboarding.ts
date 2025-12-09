import { PUBLIC_API_URL } from '$env/static/public';
import { fetchWithAuth } from '$lib/auth';
import type { UserRole } from '$lib/stores/auth';

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
};

export type RequestJoinDto = {
	companyId: string;
	name: string;
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

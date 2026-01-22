import { PUBLIC_API_URL } from '$env/static/public';
import { fetchWithAuth } from '$lib/auth';

const API_BASE = PUBLIC_API_URL;

export type ProjectSummary = {
	id: string;
	name: string;
	code: string;
	totalMinutes: number;
	totalCost: number;
};

export type ProjectsSummaryResponse = {
	projects: ProjectSummary[];
};

export type WorkerBreakdown = {
	id: string;
	name: string;
	minutes: number;
	hourlyCost: number;
	totalCost: number;
};

export type ProjectBreakdownResponse = {
	workers: WorkerBreakdown[];
};

export type WorkerSummary = {
	id: string;
	name: string;
	hourlyCost: number;
	totalMinutes: number;
	totalCost: number;
};

export type WorkersSummaryResponse = {
	workers: WorkerSummary[];
};

export type ProjectBreakdown = {
	id: string;
	name: string;
	code: string;
	minutes: number;
	cost: number;
};

export type WorkerBreakdownResponse = {
	worker: {
		id: string;
		name: string;
		hourlyCost: number;
	};
	projects: ProjectBreakdown[];
};

// Payroll Summary Types
export type PayrollUserSummary = {
	id: string;
	name: string;
	email: string;
	team: { id: string; name: string } | null;
	hourlyCost: number;
	expectedMinutes: number;
	loggedMinutes: number;
	differenceMinutes: number; // positive = extra, negative = missing
	expectedWorkDays: number;
	daysWorked: number;
	daysMissing: number;
	vacationDays: number;
	sickLeaveDays: number;
	otherAbsenceDays: number;
	totalCost: number;
};

export type PayrollSummaryTotals = {
	expectedMinutes: number;
	loggedMinutes: number;
	differenceMinutes: number;
	vacationDays: number;
	sickLeaveDays: number;
	otherAbsenceDays: number;
	totalCost: number;
};

export type PayrollSummaryResponse = {
	startDate: string;
	endDate: string;
	users: PayrollUserSummary[];
	totals: PayrollSummaryTotals;
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

export async function fetchProjectsSummary(): Promise<ProjectsSummaryResponse> {
	const response = await fetchWithAuth(`${API_BASE}/analytics/projects-summary`);
	return handleJsonResponse<ProjectsSummaryResponse>(response);
}

export async function fetchProjectBreakdown(projectId: string): Promise<ProjectBreakdownResponse> {
	const response = await fetchWithAuth(`${API_BASE}/analytics/projects/${projectId}/breakdown`);
	return handleJsonResponse<ProjectBreakdownResponse>(response);
}

export async function fetchWorkersSummary(): Promise<WorkersSummaryResponse> {
	const response = await fetchWithAuth(`${API_BASE}/analytics/workers-summary`);
	return handleJsonResponse<WorkersSummaryResponse>(response);
}

export async function fetchWorkerBreakdown(workerId: string): Promise<WorkerBreakdownResponse> {
	const response = await fetchWithAuth(`${API_BASE}/analytics/workers/${workerId}/breakdown`);
	return handleJsonResponse<WorkerBreakdownResponse>(response);
}

export async function fetchPayrollSummary(
	startDate: string,
	endDate: string
): Promise<PayrollSummaryResponse> {
	const params = new URLSearchParams();
	params.set('startDate', startDate);
	params.set('endDate', endDate);
	const response = await fetchWithAuth(
		`${API_BASE}/analytics/payroll-summary?${params.toString()}`
	);
	return handleJsonResponse<PayrollSummaryResponse>(response);
}

export function formatHours(minutes: number): string {
	const hours = minutes / 60;
	return `${hours.toFixed(1)}h`;
}

export function formatCost(cost: number): string {
	return new Intl.NumberFormat('es-ES', {
		style: 'currency',
		currency: 'EUR',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(cost);
}

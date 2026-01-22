import { PUBLIC_API_URL } from '$env/static/public';
import { fetchWithAuth } from '$lib/auth';
import type { ProviderInfo } from './providers';

const API_BASE = PUBLIC_API_URL;

// ==================== Types ====================

export type ExternalCostExpenseType =
	| 'TRANSFER_PRICING'
	| 'PROJECT_EXTERNALS'
	| 'OTHER_PROFESSIONALS'
	| 'STRUCTURE_COSTS'
	| 'OTHER';

export const EXPENSE_TYPE_LABELS: Record<ExternalCostExpenseType, string> = {
	TRANSFER_PRICING: 'Precios de Transferencia',
	PROJECT_EXTERNALS: 'Profesionales Externos de Proyectos',
	OTHER_PROFESSIONALS: 'Otros Profesionales',
	STRUCTURE_COSTS: 'Costes de Estructura',
	OTHER: 'Otros'
};

export type MonthlyRevenue = {
	id: string;
	projectId: string;
	year: number;
	month: number;
	estimatedRevenue: number | null;
	actualRevenue: number | null;
	notes: string | null;
	createdAt: string;
	updatedAt: string | null;
};

export type CostEstimate = {
	id: string;
	projectId: string;
	year: number;
	month: number;
	amount: number;
	provider: ProviderInfo | null;
	expenseType: ExternalCostExpenseType | null;
	description: string | null;
	createdAt: string;
	updatedAt: string | null;
};

export type CostActual = {
	id: string;
	projectId: string;
	year: number;
	month: number;
	amount: number;
	provider: ProviderInfo;
	expenseType: ExternalCostExpenseType;
	description: string | null;
	isBilled: boolean;
	issueDate: string | null;
	createdAt: string;
	updatedAt: string | null;
};

export type MonthlyCashFlowSummary = {
	projectId: string;
	year: number;
	month: number;
	revenue: {
		estimated: number | null;
		actual: number | null;
	};
	externalCosts: {
		estimated: {
			total: number;
			items: CostEstimate[];
		};
		actual: {
			total: number;
			items: CostActual[];
		};
	};
	internalCosts: number;
	netResult: {
		estimated: number | null;
		actual: number | null;
	};
};

// Types for all-projects summary endpoint
export type MonthCashFlow = {
	month: number;
	revenue: {
		estimated: number | null;
		actual: number | null;
	};
	externalCosts: {
		estimated: number;
		actual: number;
	};
	internalCosts: number;
	netResult: {
		estimated: number | null;
		actual: number | null;
	};
};

export type ProjectCashFlowSummary = {
	projectId: string;
	projectName: string;
	teamId: string | null;
	year: number;
	months: MonthCashFlow[];
};

export type AllProjectsCashFlowResponse = {
	projects: ProjectCashFlowSummary[];
};

// ==================== DTOs ====================

export type UpsertRevenueDto = {
	estimatedRevenue?: number | null;
	actualRevenue?: number | null;
	notes?: string | null;
};

export type CreateCostEstimateDto = {
	year: number;
	month: number;
	amount: number;
	providerId?: string;
	expenseType?: ExternalCostExpenseType;
	description?: string;
};

export type UpdateCostEstimateDto = {
	amount?: number;
	providerId?: string | null;
	expenseType?: ExternalCostExpenseType | null;
	description?: string | null;
};

export type CreateCostActualDto = {
	year: number;
	month: number;
	amount: number;
	providerId: string;
	expenseType: ExternalCostExpenseType;
	description?: string;
	isBilled?: boolean;
	issueDate?: string;
};

export type UpdateCostActualDto = {
	amount?: number;
	providerId?: string;
	expenseType?: ExternalCostExpenseType;
	description?: string | null;
	isBilled?: boolean;
	issueDate?: string | null;
};

// ==================== Helper ====================

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

// ==================== Revenue API ====================

export async function fetchMonthlyRevenues(
	projectId: string,
	year: number
): Promise<MonthlyRevenue[]> {
	const response = await fetchWithAuth(
		`${API_BASE}/cash-flow/projects/${projectId}/revenue?year=${year}`
	);
	return handleJsonResponse<MonthlyRevenue[]>(response);
}

export async function upsertMonthlyRevenue(
	projectId: string,
	year: number,
	month: number,
	data: UpsertRevenueDto
): Promise<MonthlyRevenue> {
	const response = await fetchWithAuth(
		`${API_BASE}/cash-flow/projects/${projectId}/revenue/${year}/${month}`,
		{
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		}
	);
	return handleJsonResponse<MonthlyRevenue>(response);
}

// ==================== Cost Estimates API ====================

export async function fetchCostEstimates(
	projectId: string,
	year: number,
	month: number
): Promise<CostEstimate[]> {
	const response = await fetchWithAuth(
		`${API_BASE}/cash-flow/projects/${projectId}/cost-estimates?year=${year}&month=${month}`
	);
	return handleJsonResponse<CostEstimate[]>(response);
}

export async function createCostEstimate(
	projectId: string,
	data: CreateCostEstimateDto
): Promise<CostEstimate> {
	const response = await fetchWithAuth(
		`${API_BASE}/cash-flow/projects/${projectId}/cost-estimates`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		}
	);
	return handleJsonResponse<CostEstimate>(response);
}

export async function updateCostEstimate(
	id: string,
	data: UpdateCostEstimateDto
): Promise<CostEstimate> {
	const response = await fetchWithAuth(`${API_BASE}/cash-flow/cost-estimates/${id}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<CostEstimate>(response);
}

export async function deleteCostEstimate(id: string): Promise<void> {
	const response = await fetchWithAuth(`${API_BASE}/cash-flow/cost-estimates/${id}`, {
		method: 'DELETE'
	});
	await handleJsonResponse<unknown>(response);
}

// ==================== Cost Actuals API ====================

export async function fetchCostActuals(
	projectId: string,
	year: number,
	month: number
): Promise<CostActual[]> {
	const response = await fetchWithAuth(
		`${API_BASE}/cash-flow/projects/${projectId}/cost-actuals?year=${year}&month=${month}`
	);
	return handleJsonResponse<CostActual[]>(response);
}

export async function createCostActual(
	projectId: string,
	data: CreateCostActualDto
): Promise<CostActual> {
	const response = await fetchWithAuth(`${API_BASE}/cash-flow/projects/${projectId}/cost-actuals`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<CostActual>(response);
}

export async function updateCostActual(id: string, data: UpdateCostActualDto): Promise<CostActual> {
	const response = await fetchWithAuth(`${API_BASE}/cash-flow/cost-actuals/${id}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<CostActual>(response);
}

export async function deleteCostActual(id: string): Promise<void> {
	const response = await fetchWithAuth(`${API_BASE}/cash-flow/cost-actuals/${id}`, {
		method: 'DELETE'
	});
	await handleJsonResponse<unknown>(response);
}

// ==================== Monthly Summary API ====================

export async function fetchMonthlyCashFlow(
	projectId: string,
	year: number,
	month: number
): Promise<MonthlyCashFlowSummary> {
	const response = await fetchWithAuth(
		`${API_BASE}/cash-flow/projects/${projectId}/monthly/${year}/${month}`
	);
	return handleJsonResponse<MonthlyCashFlowSummary>(response);
}

export async function fetchAllProjectsCashFlow(
	year: number,
	month: number
): Promise<AllProjectsCashFlowResponse> {
	const response = await fetchWithAuth(
		`${API_BASE}/cash-flow/projects-summary?year=${year}&month=${month}`
	);
	return handleJsonResponse<AllProjectsCashFlowResponse>(response);
}

// ==================== Utility Functions ====================

/**
 * Format a number as currency in Spanish locale
 */
export function formatCurrency(value: number | null | undefined): string {
	if (value === null || value === undefined) {
		return '—';
	}
	return new Intl.NumberFormat('es-ES', {
		style: 'currency',
		currency: 'EUR',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(value);
}

/**
 * Get Spanish month name
 */
export function getMonthName(month: number): string {
	const months = [
		'Enero',
		'Febrero',
		'Marzo',
		'Abril',
		'Mayo',
		'Junio',
		'Julio',
		'Agosto',
		'Septiembre',
		'Octubre',
		'Noviembre',
		'Diciembre'
	];
	return months[month - 1] ?? '';
}

/**
 * Get all months as options for select
 */
export function getMonthOptions(): { value: number; label: string }[] {
	return Array.from({ length: 12 }, (_, i) => ({
		value: i + 1,
		label: getMonthName(i + 1)
	}));
}

/**
 * Get year options (current year ± 5 years)
 */
export function getYearOptions(): { value: number; label: string }[] {
	const currentYear = new Date().getFullYear();
	const years: { value: number; label: string }[] = [];
	for (let y = currentYear - 5; y <= currentYear + 5; y++) {
		years.push({ value: y, label: y.toString() });
	}
	return years;
}

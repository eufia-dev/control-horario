import { PUBLIC_API_URL } from '$env/static/public';
import { fetchWithAuth } from '$lib/auth';

const API_BASE = PUBLIC_API_URL;

// ==================== Types ====================

export type MonthClosingStatus = 'OPEN' | 'CLOSED' | 'REOPENED';

export type OverheadCostType =
	| 'TRANSFER_PRICING'
	| 'OTHER_PROFESSIONALS'
	| 'STRUCTURE_COSTS'
	| 'OTHER';

export const OVERHEAD_COST_TYPE_LABELS: Record<OverheadCostType, string> = {
	TRANSFER_PRICING: 'Precios de Transferencia',
	OTHER_PROFESSIONALS: 'Otros Profesionales',
	STRUCTURE_COSTS: 'Costes de Estructura',
	OTHER: 'Otros'
};

// ==================== Monthly Salaries Types ====================

export type UserMonthlySalary = {
	id: string | null; // MonthlyUserSalary record ID (null if no extras entered yet)
	userId: string;
	userName: string;
	userEmail: string;
	baseSalary: number | null; // From User.salary (null if user has no salary set)
	extras: number; // From MonthlyUserSalary.extras (0 if no record)
	totalSalary: number | null; // baseSalary + extras (null if baseSalary is null)
	notes: string | null;
};

export type MonthlySalariesResponse = {
	year: number;
	month: number;
	monthStatus: MonthClosingStatus;
	users: UserMonthlySalary[];
	totals: {
		baseSalaries: number;
		extras: number;
		total: number;
	};
};

export type UpsertMonthlySalaryDto = {
	userId: string;
	year: number;
	month: number;
	baseSalary?: number;
	extras?: number;
	notes?: string;
};

export type MonthlySalaryResponse = {
	id: string;
	userId: string;
	year: number;
	month: number;
	baseSalary: number;
	extras: number;
	totalSalary: number;
	notes: string | null;
	warning?: string;
};

// ==================== Monthly Overhead Types ====================

export type OverheadCost = {
	id: string;
	amount: number;
	costType: OverheadCostType;
	description: string | null;
	createdAt: string;
	updatedAt: string | null;
};

export type MonthlyOverheadResponse = {
	year: number;
	month: number;
	monthStatus: MonthClosingStatus;
	costs: OverheadCost[];
	total: number;
};

export type OverheadCostTypeOption = {
	value: OverheadCostType;
	label: string;
};

export type CreateOverheadCostDto = {
	year: number;
	month: number;
	amount: number;
	costType: OverheadCostType;
	description?: string;
};

export type UpdateOverheadCostDto = {
	amount?: number;
	costType?: OverheadCostType;
	description?: string;
};

// ==================== Month Closing Types ====================

export type ProjectDistribution = {
	projectId: string;
	projectName: string;
	projectCode: string;
	projectRevenue: number;
	revenueSharePercent: number;
	directSalaryCosts: number; // hours worked × cost/hour
	distributedSalaries: number; // non-productive pool share
	distributedOverhead: number;
	distributedNonProductive: number;
	totalDistributed: number; // directSalaryCosts + distributedSalaries + distributedOverhead + distributedNonProductive
};

export type MonthlyClosingResponse = {
	id: string | null; // null if month has never been closed
	year: number;
	month: number;
	status: MonthClosingStatus;
	// Totals (null if never closed)
	totalSalaries: number | null;
	totalOverhead: number | null;
	totalNonProductive: number | null;
	totalAbsenceCosts: number | null;
	totalDirectSalaryCosts: number | null;
	totalRevenue: number | null;
	// Audit info
	closedBy: { id: string; name: string } | null;
	closedAt: string | null;
	reopenedBy: { id: string; name: string } | null;
	reopenedAt: string | null;
	reopenReason: string | null;
	// Distributions (only present if status !== 'OPEN')
	distributions: ProjectDistribution[] | null;
};

export type ValidationError = {
	type: 'MISSING_SALARY' | 'MISSING_REVENUE' | 'NO_ACTIVE_PROJECTS' | 'ZERO_REVENUE';
	message: string;
	details?: {
		userId?: string;
		userName?: string;
		projectId?: string;
		projectName?: string;
	};
};

export type DistributionPreviewResponse = {
	year: number;
	month: number;
	canClose: boolean;
	validationErrors: ValidationError[];
	// Preview data
	totalSalaries: number;
	totalOverhead: number;
	totalNonProductive: number; // includes absence costs
	totalAbsenceCosts: number; // breakdown of absence hours cost
	totalDirectSalaryCosts: number; // sum of direct costs across projects
	totalRevenue: number;
	distributions: ProjectDistribution[];
};

export type CloseMonthResponse = {
	success: boolean;
	closing: MonthlyClosingResponse;
};

export type ReopenMonthDto = {
	reason: string;
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

// ==================== Monthly Salaries API ====================

export async function fetchMonthlySalaries(
	year: number,
	month: number
): Promise<MonthlySalariesResponse> {
	const response = await fetchWithAuth(
		`${API_BASE}/costs/monthly-salaries?year=${year}&month=${month}`
	);
	return handleJsonResponse<MonthlySalariesResponse>(response);
}

export async function upsertMonthlySalary(
	data: UpsertMonthlySalaryDto
): Promise<MonthlySalaryResponse> {
	const response = await fetchWithAuth(`${API_BASE}/costs/monthly-salaries`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<MonthlySalaryResponse>(response);
}

export async function deleteMonthlySalary(id: string): Promise<void> {
	const response = await fetchWithAuth(`${API_BASE}/costs/monthly-salaries/${id}`, {
		method: 'DELETE'
	});
	if (!response.ok) {
		const text = await response.text();
		let message = 'Error al eliminar';
		try {
			const data = text ? JSON.parse(text) : null;
			message = data?.message ?? message;
		} catch {
			if (text) message = text;
		}
		throw new Error(message);
	}
}

// ==================== Monthly Overhead API ====================

export async function fetchOverheadCostTypes(): Promise<OverheadCostTypeOption[]> {
	const response = await fetchWithAuth(`${API_BASE}/costs/overhead-cost-types`);
	return handleJsonResponse<OverheadCostTypeOption[]>(response);
}

export async function fetchMonthlyOverhead(
	year: number,
	month: number
): Promise<MonthlyOverheadResponse> {
	const response = await fetchWithAuth(
		`${API_BASE}/costs/monthly-overhead?year=${year}&month=${month}`
	);
	return handleJsonResponse<MonthlyOverheadResponse>(response);
}

export async function createOverheadCost(
	data: CreateOverheadCostDto
): Promise<OverheadCost & { warning?: string }> {
	const response = await fetchWithAuth(`${API_BASE}/costs/monthly-overhead`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<OverheadCost & { warning?: string }>(response);
}

export async function updateOverheadCost(
	id: string,
	data: UpdateOverheadCostDto
): Promise<OverheadCost & { warning?: string }> {
	const response = await fetchWithAuth(`${API_BASE}/costs/monthly-overhead/${id}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<OverheadCost & { warning?: string }>(response);
}

export async function deleteOverheadCost(id: string): Promise<void> {
	const response = await fetchWithAuth(`${API_BASE}/costs/monthly-overhead/${id}`, {
		method: 'DELETE'
	});
	if (!response.ok) {
		const text = await response.text();
		let message = 'Error al eliminar';
		try {
			const data = text ? JSON.parse(text) : null;
			message = data?.message ?? message;
		} catch {
			if (text) message = text;
		}
		throw new Error(message);
	}
}

// ==================== Month Closing API ====================

export async function fetchMonthlyClosing(
	year: number,
	month: number
): Promise<MonthlyClosingResponse> {
	const response = await fetchWithAuth(`${API_BASE}/costs/monthly-closing/${year}/${month}`);
	return handleJsonResponse<MonthlyClosingResponse>(response);
}

export async function fetchClosingPreview(
	year: number,
	month: number
): Promise<DistributionPreviewResponse> {
	const response = await fetchWithAuth(
		`${API_BASE}/costs/monthly-closing/${year}/${month}/preview`
	);
	return handleJsonResponse<DistributionPreviewResponse>(response);
}

export async function closeMonth(year: number, month: number): Promise<CloseMonthResponse> {
	const response = await fetchWithAuth(`${API_BASE}/costs/monthly-closing/${year}/${month}/close`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({})
	});
	return handleJsonResponse<CloseMonthResponse>(response);
}

export async function reopenMonth(
	year: number,
	month: number,
	reason: string
): Promise<MonthlyClosingResponse> {
	const response = await fetchWithAuth(
		`${API_BASE}/costs/monthly-closing/${year}/${month}/reopen`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ reason } as ReopenMonthDto)
		}
	);
	return handleJsonResponse<MonthlyClosingResponse>(response);
}

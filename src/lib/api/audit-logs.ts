import { PUBLIC_API_URL } from '$env/static/public';
import { fetchWithAuth } from '$lib/auth';

const API_BASE = PUBLIC_API_URL;

// ── Types ────────────────────────────────────────────────────────────

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export type AuditLogChangeValue = {
	old?: string | number | boolean | null;
	new?: string | number | boolean | null;
};

/** Field-level diff map: { fieldName: { old?, new? } } */
export type AuditLogChanges = Record<string, AuditLogChangeValue>;

export type AuditLogActor = {
	id: string;
	name: string;
};

export type AuditLogTimeEntrySummary = {
	id: string;
	startTime: string;
	endTime: string;
	entryType: string;
};

/** Audit log for a single time entry */
export type AuditLog = {
	id: string;
	timeEntryId: string;
	action: AuditAction;
	reason?: string | null;
	changes: AuditLogChanges;
	actor: AuditLogActor;
	timestamp: string;
};

/** Audit log with embedded time entry context (used in user-level feed) */
export type AuditLogWithEntry = AuditLog & {
	timeEntry?: AuditLogTimeEntrySummary | null;
};

// ── Helpers ──────────────────────────────────────────────────────────

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

// ── API Functions ────────────────────────────────────────────────────

/**
 * Fetch audit logs for a specific time entry.
 * Requires admin/team-leader role.
 */
export async function fetchTimeEntryAuditLogs(timeEntryId: string): Promise<AuditLog[]> {
	const response = await fetchWithAuth(`${API_BASE}/time-entries/${timeEntryId}/audit-logs`);
	return handleJsonResponse<AuditLog[]>(response);
}

/**
 * Fetch all audit logs for a user's time entries in a given period.
 * Requires admin/team-leader role.
 */
export async function fetchUserAuditLogs(
	userId: string,
	year?: number,
	month?: number
): Promise<AuditLogWithEntry[]> {
	const params = new URLSearchParams();
	params.append('userId', userId);
	if (year !== undefined) params.append('year', year.toString());
	if (month !== undefined) params.append('month', month.toString());
	const url = `${API_BASE}/audit-logs?${params.toString()}`;
	const response = await fetchWithAuth(url);
	return handleJsonResponse<AuditLogWithEntry[]>(response);
}

// ── Display Helpers ──────────────────────────────────────────────────

/** Spanish labels for audit log field names */
export const FIELD_LABELS: Record<string, string> = {
	startTime: 'Hora inicio',
	endTime: 'Hora fin',
	durationMinutes: 'Duración',
	entryType: 'Tipo',
	projectId: 'Proyecto',
	project: 'Proyecto',
	isInOffice: 'Ubicación',
	source: 'Origen',
	isManual: 'Manual'
};

/** Spanish labels for audit actions */
export const ACTION_LABELS: Record<AuditAction, string> = {
	CREATE: 'Creado',
	UPDATE: 'Editado',
	DELETE: 'Eliminado'
};

/** Icon names for each action */
export const ACTION_ICONS: Record<AuditAction, string> = {
	CREATE: 'add_circle',
	UPDATE: 'edit',
	DELETE: 'delete'
};

/** Badge variant for each action */
export const ACTION_VARIANTS: Record<AuditAction, 'default' | 'secondary' | 'destructive'> = {
	CREATE: 'default',
	UPDATE: 'secondary',
	DELETE: 'destructive'
};

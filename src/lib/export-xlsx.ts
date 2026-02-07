import { utils, writeFileXLSX } from 'xlsx';
import type { TimeEntry, TimeEntryType } from '$lib/api/time-entries';
import type { AuditLogWithEntry, AuditLogChanges } from '$lib/api/audit-logs';
import { ACTION_LABELS, FIELD_LABELS } from '$lib/api/audit-logs';

// ── Formatting helpers ──────────────────────────────────────────────

const ENTRY_TYPE_LABELS: Record<string, string> = {
	WORK: 'Trabajo',
	PAUSE_COFFEE: 'Pausa café',
	PAUSE_LUNCH: 'Pausa comida',
	PAUSE_PERSONAL: 'Pausa personal'
};

const SOURCE_LABELS: Record<string, string> = {
	WEB: 'Web',
	APP: 'App',
	WHATSAPP: 'WhatsApp'
};

function fmtDate(iso: string): string {
	const d = new Date(iso);
	return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtTime(iso: string): string {
	return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function fmtDateTime(iso: string): string {
	return `${fmtDate(iso)} ${fmtTime(iso)}`;
}

function fmtDuration(minutes: number): string {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (h > 0 && m > 0) return `${h}h ${m}m`;
	if (h > 0) return `${h}h`;
	return `${m}m`;
}

function fmtFieldValue(field: string, value: unknown): string {
	if (value === null || value === undefined) return '-';
	if (field === 'startTime' || field === 'endTime') return fmtTime(String(value));
	if (field === 'durationMinutes') return fmtDuration(Number(value));
	if (field === 'isInOffice') return value ? 'Oficina' : 'Remoto';
	if (field === 'entryType') return ENTRY_TYPE_LABELS[String(value)] ?? String(value);
	if (field === 'source') return SOURCE_LABELS[String(value)] ?? String(value);
	if (field === 'isManual') return value ? 'Sí' : 'No';
	return String(value);
}

function sanitize(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9_-]/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_|_$/g, '')
		.toLowerCase();
}

function buildFilename(prefix: string, companyName: string, userName: string, month: Date): string {
	const y = month.getFullYear();
	const m = String(month.getMonth() + 1).padStart(2, '0');
	return `${prefix}_${sanitize(companyName)}_${sanitize(userName)}_${m}_${y}.xlsx`;
}

const MONTH_NAMES = [
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

// ── Time Entries Export ──────────────────────────────────────────────

export function exportTimeEntriesToXlsx(
	entries: TimeEntry[],
	timeEntryTypes: TimeEntryType[],
	month: Date,
	userName: string,
	companyName: string
): void {
	const typeMap = new Map(timeEntryTypes.map((t) => [t.value, t.name]));

	const rows = entries.map((e) => ({
		Fecha: fmtDate(e.startTime),
		'Hora inicio': fmtTime(e.startTime),
		'Hora fin': fmtTime(e.endTime),
		Duración: fmtDuration(e.durationMinutes),
		Tipo:
			e.timeEntryType?.name ??
			typeMap.get(e.entryType) ??
			ENTRY_TYPE_LABELS[e.entryType] ??
			e.entryType,
		Proyecto: e.project?.name ?? '',
		Ubicación: e.isInOffice ? 'Oficina' : 'Remoto',
		Origen: e.source ? (SOURCE_LABELS[e.source] ?? e.source) : '',
		Estado: [e.isModified ? 'Modificado' : '', e.isManual ? 'Manual' : '']
			.filter(Boolean)
			.join(', ')
	}));

	const ws = utils.json_to_sheet(rows);

	// Auto-size columns based on header + content widths
	const colKeys = Object.keys(rows[0] ?? {});
	ws['!cols'] = colKeys.map((key) => {
		const maxLen = Math.max(
			key.length,
			...rows.map((r) => String((r as Record<string, string>)[key] ?? '').length)
		);
		return { wch: Math.min(maxLen + 2, 40) };
	});

	const wb = utils.book_new();
	const monthLabel = `${MONTH_NAMES[month.getMonth()]} ${month.getFullYear()}`;
	utils.book_append_sheet(wb, ws, `Registros ${monthLabel}`);

	writeFileXLSX(wb, buildFilename('registros', companyName, userName, month));
}

// ── Audit Logs Export ───────────────────────────────────────────────

function formatChanges(changes: AuditLogChanges): string {
	const fields = Object.keys(changes).filter((k) => k in FIELD_LABELS || k === 'projectId');
	if (fields.length === 0) return '';

	return fields
		.map((f) => {
			const label = FIELD_LABELS[f] ?? f;
			const c = changes[f];
			const oldVal = fmtFieldValue(f, c.old);
			const newVal = fmtFieldValue(f, c.new);
			return `${label}: ${oldVal} → ${newVal}`;
		})
		.join('; ');
}

export function exportAuditLogsToXlsx(
	logs: AuditLogWithEntry[],
	month: Date,
	userName: string,
	companyName: string
): void {
	const rows = logs.map((log) => ({
		Fecha: fmtDateTime(log.timestamp),
		Acción: ACTION_LABELS[log.action] ?? log.action,
		Registro: log.timeEntry
			? `${fmtTime(log.timeEntry.startTime)} - ${fmtTime(log.timeEntry.endTime)}`
			: 'Registro eliminado',
		'Realizado por': log.actor.name,
		Motivo: log.reason ?? '',
		Cambios: formatChanges(log.changes)
	}));

	const ws = utils.json_to_sheet(rows);

	const colKeys = Object.keys(rows[0] ?? {});
	ws['!cols'] = colKeys.map((key) => {
		const maxLen = Math.max(
			key.length,
			...rows.map((r) => String((r as Record<string, string>)[key] ?? '').length)
		);
		return { wch: Math.min(maxLen + 2, 60) };
	});

	const wb = utils.book_new();
	const monthLabel = `${MONTH_NAMES[month.getMonth()]} ${month.getFullYear()}`;
	utils.book_append_sheet(wb, ws, `Auditoría ${monthLabel}`);

	writeFileXLSX(wb, buildFilename('auditoria', companyName, userName, month));
}

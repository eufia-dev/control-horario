/**
 * Calendar & Labor Compliance Types
 * Central type definitions for the working calendar feature
 */

// Re-export types from API files for convenience
export type {
	SpainRegion,
	HolidaySource,
	HolidayResponse,
	CompanyHolidayResponse,
	CreateCompanyHolidayDto,
	SyncHolidaysResponse
} from '$lib/api/holidays';

export type {
	AbsenceType,
	AbsenceStatus,
	AbsenceTypeOption,
	AbsenceResponse,
	AbsenceStats,
	CreateAbsenceDto,
	ReviewAbsenceDto
} from '$lib/api/absences';

export type {
	DayStatus,
	EntryType,
	TimeEntryBrief,
	CalendarDay,
	CalendarSummary,
	CalendarResponse
} from '$lib/api/calendar';

export type { LocationResponse, UpdateLocationDto } from '$lib/api/company-location';

// Helper type for absence type display names
export const ABSENCE_TYPE_LABELS: Record<string, string> = {
	VACATION: 'Vacaciones',
	SICK_LEAVE: 'Baja por enfermedad',
	PERSONAL_LEAVE: 'Asuntos propios',
	MATERNITY: 'Maternidad',
	PATERNITY: 'Paternidad',
	UNPAID_LEAVE: 'Excedencia',
	TRAINING: 'Formación',
	OTHER: 'Otro'
};

// Helper type for absence status display names
export const ABSENCE_STATUS_LABELS: Record<string, string> = {
	PENDING: 'Pendiente',
	APPROVED: 'Aprobada',
	REJECTED: 'Rechazada',
	CANCELLED: 'Cancelada'
};

// Helper type for day status display
export const DAY_STATUS_LABELS: Record<string, string> = {
	PUBLIC_HOLIDAY: 'Festivo',
	COMPANY_HOLIDAY: 'Festivo de empresa',
	ABSENCE: 'Ausencia',
	NON_WORKING_DAY: 'No laborable',
	WORKED: 'Trabajado',
	PARTIALLY_WORKED: 'Parcialmente trabajado',
	MISSING_LOGS: 'Sin registrar',
	FUTURE: 'Futuro'
};

// Day status color mapping for calendar UI
export type DayStatusStyle = {
	bgClass: string;
	textClass: string;
	borderClass?: string;
};

export const DAY_STATUS_STYLES: Record<string, DayStatusStyle> = {
	WORKED: {
		bgClass: 'bg-success/20',
		textClass: 'text-success'
	},
	PARTIALLY_WORKED: {
		bgClass: 'bg-yellow-500/20',
		textClass: 'text-yellow-600 dark:text-yellow-500'
	},
	MISSING_LOGS: {
		bgClass: 'bg-destructive/20',
		textClass: 'text-destructive'
	},
	PUBLIC_HOLIDAY: {
		bgClass: 'bg-blue-500/20',
		textClass: 'text-blue-600 dark:text-blue-400'
	},
	COMPANY_HOLIDAY: {
		bgClass: 'bg-blue-500/20',
		textClass: 'text-blue-600 dark:text-blue-400'
	},
	ABSENCE: {
		bgClass: 'bg-purple-500/20',
		textClass: 'text-purple-600 dark:text-purple-400'
	},
	NON_WORKING_DAY: {
		bgClass: 'bg-muted',
		textClass: 'text-muted-foreground'
	},
	FUTURE: {
		bgClass: 'bg-muted/50',
		textClass: 'text-muted-foreground/50'
	}
};

// Absence status color mapping
export type AbsenceStatusStyle = {
	variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
	icon: string;
};

export const ABSENCE_STATUS_STYLES: Record<string, AbsenceStatusStyle> = {
	PENDING: {
		variant: 'secondary',
		icon: 'schedule'
	},
	APPROVED: {
		variant: 'success',
		icon: 'check_circle'
	},
	REJECTED: {
		variant: 'destructive',
		icon: 'cancel'
	},
	CANCELLED: {
		variant: 'outline',
		icon: 'block'
	}
};

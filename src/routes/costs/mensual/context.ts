import type { MonthClosingStatus, MonthlyClosingResponse } from '$lib/api/month-closing';

export const MENSUAL_CONTEXT_KEY = 'mensual-context';

export type MensualContext = {
	year: number;
	month: number;
	monthStatus: MonthClosingStatus;
	closingData: MonthlyClosingResponse | null;
	loadingClosing: boolean;
	onStatusChange: (status: MonthClosingStatus, data?: MonthlyClosingResponse) => void;
};

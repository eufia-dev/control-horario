import { PUBLIC_API_URL } from '$env/static/public';
import { fetchWithAuth } from '$lib/auth';
import {
	clearPendingLegalConsentBatch,
	createConsentBatch,
	getPendingLegalConsentBatch,
	type LegalConsentSource,
	type LegalDocumentType,
	LEGAL_DOCUMENTS,
	savePendingLegalConsentBatch,
	GENERAL_ACCESS_REQUIRED_CONSENTS
} from '$lib/legal';

const API_BASE = PUBLIC_API_URL;

export type ConsentVersion = {
	documentType: LegalDocumentType;
	version: string;
};

export type AcceptLegalConsentsDto = {
	source: LegalConsentSource;
	consents: ConsentVersion[];
};

export type LegalConsentRecord = {
	documentType: LegalDocumentType;
	version: string;
	acceptedAt: string;
	ipAddress?: string;
	userAgent?: string;
	source: LegalConsentSource;
};

export type LegalRequiredDocument = {
	documentType: LegalDocumentType;
	version: string;
	required: boolean;
};

export type MyLegalConsentsResponse = {
	consents: LegalConsentRecord[];
};

export type CurrentLegalDocumentsResponse = {
	documents: LegalRequiredDocument[];
};

export type LegalConsentStatus = {
	canEvaluate: boolean;
	isCompliant: boolean;
	missing: LegalRequiredDocument[];
	consents: LegalConsentRecord[];
	error?: string;
};

export const LEGAL_CONSENTS_UPDATED_EVENT = 'legal-consents-updated';

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

function defaultRequiredDocuments(): LegalRequiredDocument[] {
	return GENERAL_ACCESS_REQUIRED_CONSENTS.map((documentType) => ({
		documentType,
		version: LEGAL_DOCUMENTS[documentType].version,
		required: true
	}));
}

function isNotFoundError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	return error.message.includes('404') || error.message.toLowerCase().includes('not found');
}

export function notifyLegalConsentsUpdated() {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(new CustomEvent(LEGAL_CONSENTS_UPDATED_EVENT));
}

export async function acceptLegalConsents(payload: AcceptLegalConsentsDto): Promise<void> {
	const response = await fetchWithAuth(`${API_BASE}/legal/consents/accept`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(payload)
	});
	await handleJsonResponse<void>(response);
	notifyLegalConsentsUpdated();
}

export async function fetchMyLegalConsents(): Promise<LegalConsentRecord[]> {
	const response = await fetchWithAuth(`${API_BASE}/legal/consents/me`);
	const data = await handleJsonResponse<MyLegalConsentsResponse>(response);
	return data.consents ?? [];
}

export async function fetchCurrentLegalDocuments(): Promise<LegalRequiredDocument[]> {
	const response = await fetchWithAuth(`${API_BASE}/legal/documents/current`);
	const data = await handleJsonResponse<CurrentLegalDocumentsResponse>(response);
	return data.documents ?? [];
}

export async function checkLegalConsentStatus(): Promise<LegalConsentStatus> {
	let requiredDocuments: LegalRequiredDocument[] = [];
	try {
		requiredDocuments = await fetchCurrentLegalDocuments();
	} catch (error) {
		requiredDocuments = defaultRequiredDocuments();
		if (!isNotFoundError(error)) {
			console.warn(
				'[legal] No se pudo cargar catálogo legal desde backend, usando valores por defecto'
			);
		}
	}

	try {
		const consents = await fetchMyLegalConsents();
		const required = requiredDocuments.filter((doc) => doc.required);
		const missing = required.filter(
			(requiredDoc) =>
				!consents.some(
					(consent) =>
						consent.documentType === requiredDoc.documentType &&
						consent.version === requiredDoc.version
				)
		);

		return {
			canEvaluate: true,
			isCompliant: missing.length === 0,
			missing,
			consents
		};
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'No se pudo validar el estado legal del usuario';
		return {
			canEvaluate: false,
			isCompliant: true,
			missing: [],
			consents: [],
			error: message
		};
	}
}

export async function queueAndTrySyncLegalConsents(
	source: LegalConsentSource,
	documentTypes: LegalDocumentType[]
): Promise<void> {
	const batch = createConsentBatch(source, documentTypes);
	savePendingLegalConsentBatch(batch);
	await flushPendingLegalConsents();
}

export async function flushPendingLegalConsents(): Promise<void> {
	const batch = getPendingLegalConsentBatch();
	if (!batch || batch.consents.length === 0) return;
	await acceptLegalConsents({
		source: batch.source,
		consents: batch.consents
	});
	clearPendingLegalConsentBatch();
}

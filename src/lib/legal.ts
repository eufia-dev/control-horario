export type LegalDocumentType = 'TERMS' | 'PRIVACY' | 'COOKIES' | 'AVISO_LEGAL' | 'DPA';
export type LegalRoute =
	| '/legal/privacy'
	| '/legal/cookies'
	| '/legal/terms'
	| '/legal/aviso-legal'
	| '/legal/dpa';

export type LegalConsentSource = 'REGISTER' | 'ONBOARDING_CREATE_COMPANY' | 'RECONSENT';

export type LegalDocumentDefinition = {
	type: LegalDocumentType;
	title: string;
	route: LegalRoute;
	version: string;
	lastUpdated: string;
	requiredForGeneralAccess: boolean;
};

export const LEGAL_COMPANY = {
	name: 'EUFIA STRATEGIC GROUP S.L.',
	cif: 'B24973885',
	address: 'C/ Isaac Newton, 0, Edificio 17, ParcBit - 07120 Palma (Illes Balears), Spain.',
	registry: 'Inscrita en el Registro Mercantil de Palma de Mallorca.',
	email: 'info@eufia.eu',
	phone: '+34 686 733 922',
	website: 'https://www.eufia.eu',
	serviceName: 'EUFIA Control Horario',
	serviceUrl: 'https://control-horario.eufia.eu'
} as const;

export const LEGAL_DOCUMENTS: Record<LegalDocumentType, LegalDocumentDefinition> = {
	TERMS: {
		type: 'TERMS',
		title: 'Términos y Condiciones',
		route: '/legal/terms',
		version: 'v1.0',
		lastUpdated: '15/02/2026',
		requiredForGeneralAccess: true
	},
	PRIVACY: {
		type: 'PRIVACY',
		title: 'Política de Privacidad',
		route: '/legal/privacy',
		version: 'v1.0',
		lastUpdated: '15/02/2026',
		requiredForGeneralAccess: true
	},
	COOKIES: {
		type: 'COOKIES',
		title: 'Política de Cookies',
		route: '/legal/cookies',
		version: 'v1.0',
		lastUpdated: '15/02/2026',
		requiredForGeneralAccess: false
	},
	AVISO_LEGAL: {
		type: 'AVISO_LEGAL',
		title: 'Aviso Legal',
		route: '/legal/aviso-legal',
		version: 'v1.0',
		lastUpdated: '15/02/2026',
		requiredForGeneralAccess: false
	},
	DPA: {
		type: 'DPA',
		title: 'Contrato de Encargado (DPA)',
		route: '/legal/dpa',
		version: 'v1.0',
		lastUpdated: '15/02/2026',
		requiredForGeneralAccess: false
	}
};

export const PUBLIC_LEGAL_ROUTES = [
	LEGAL_DOCUMENTS.PRIVACY.route,
	LEGAL_DOCUMENTS.COOKIES.route,
	LEGAL_DOCUMENTS.TERMS.route,
	LEGAL_DOCUMENTS.AVISO_LEGAL.route,
	LEGAL_DOCUMENTS.DPA.route
] as const;

export const REGISTER_REQUIRED_CONSENTS: LegalDocumentType[] = ['TERMS', 'PRIVACY'];
export const REGISTER_INFORMATION_ACKNOWLEDGEMENTS: LegalDocumentType[] = ['COOKIES'];
export const CREATE_COMPANY_REQUIRED_CONSENTS: LegalDocumentType[] = ['TERMS', 'DPA'];
export const GENERAL_ACCESS_REQUIRED_CONSENTS: LegalDocumentType[] = Object.values(LEGAL_DOCUMENTS)
	.filter((doc) => doc.requiredForGeneralAccess)
	.map((doc) => doc.type);

export type PendingLegalConsentBatch = {
	source: LegalConsentSource;
	consents: Array<{
		documentType: LegalDocumentType;
		version: string;
	}>;
	createdAt: string;
};

const PENDING_LEGAL_CONSENT_STORAGE_KEY = 'control_horario_pending_legal_consent_batch';

export function createConsentBatch(
	source: LegalConsentSource,
	documentTypes: LegalDocumentType[]
): PendingLegalConsentBatch {
	return {
		source,
		consents: documentTypes.map((documentType) => ({
			documentType,
			version: LEGAL_DOCUMENTS[documentType].version
		})),
		createdAt: new Date().toISOString()
	};
}

export function savePendingLegalConsentBatch(batch: PendingLegalConsentBatch): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem(PENDING_LEGAL_CONSENT_STORAGE_KEY, JSON.stringify(batch));
}

export function getPendingLegalConsentBatch(): PendingLegalConsentBatch | null {
	if (typeof window === 'undefined') return null;
	const raw = localStorage.getItem(PENDING_LEGAL_CONSENT_STORAGE_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as PendingLegalConsentBatch;
	} catch {
		localStorage.removeItem(PENDING_LEGAL_CONSENT_STORAGE_KEY);
		return null;
	}
}

export function clearPendingLegalConsentBatch(): void {
	if (typeof window === 'undefined') return;
	localStorage.removeItem(PENDING_LEGAL_CONSENT_STORAGE_KEY);
}

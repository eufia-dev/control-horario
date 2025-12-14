import { PUBLIC_API_URL } from '$env/static/public';
import { fetchWithAuth } from '$lib/auth';

const API_BASE = PUBLIC_API_URL;

export type BugReportDto = {
	page: string; // URL/view where bug occurred
	occurredAt: string; // ISO timestamp
	description: string; // Detailed description
	stepsToReproduce?: string;
};

export type ContactMessageDto = {
	subject: string;
	message: string;
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

export async function submitBugReport(data: BugReportDto): Promise<void> {
	const response = await fetchWithAuth(`${API_BASE}/support/bug-report`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	await handleJsonResponse<void>(response);
}

export async function submitContactMessage(data: ContactMessageDto): Promise<void> {
	const response = await fetchWithAuth(`${API_BASE}/support/contact`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	await handleJsonResponse<void>(response);
}

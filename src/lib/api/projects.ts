import { PUBLIC_API_URL } from '$env/static/public';
import { fetchWithAuth } from '$lib/auth';

const API_BASE = PUBLIC_API_URL;

export type Project = {
	id: string;
	name: string;
	code: string;
	isActive: boolean;
	createdAt: string;
	companyName: string;
};

export type Company = {
	id: string;
	name: string;
};

export type CreateProjectDto = {
	name: string;
	code: string;
	companyId: string;
};

export type UpdateProjectDto = {
	name?: string;
	code?: string;
	companyId?: string;
	isActive?: boolean;
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

export async function fetchProjects(): Promise<Project[]> {
	const response = await fetchWithAuth(`${API_BASE}/projects`);
	return handleJsonResponse<Project[]>(response);
}

export async function fetchProject(id: string): Promise<Project> {
	const response = await fetchWithAuth(`${API_BASE}/projects/${id}`);
	return handleJsonResponse<Project>(response);
}

export async function createProject(data: CreateProjectDto): Promise<Project> {
	const response = await fetchWithAuth(`${API_BASE}/projects`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<Project>(response);
}

export async function updateProject(id: string, data: UpdateProjectDto): Promise<Project> {
	const response = await fetchWithAuth(`${API_BASE}/projects/${id}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<Project>(response);
}

export async function deleteProject(id: string): Promise<void> {
	const response = await fetchWithAuth(`${API_BASE}/projects/${id}`, {
		method: 'DELETE'
	});
	await handleJsonResponse<unknown>(response);
}

export async function fetchCompanies(): Promise<Company[]> {
	const response = await fetchWithAuth(`${API_BASE}/companies`);
	return handleJsonResponse<Company[]>(response);
}

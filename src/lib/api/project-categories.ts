import { PUBLIC_API_URL } from '$env/static/public';
import { fetchWithAuth } from '$lib/auth';

const API_BASE = PUBLIC_API_URL;

// ==================== Types ====================

export type ProjectCategory = {
	id: string;
	name: string;
};

// ==================== DTOs ====================

export type CreateProjectCategoryDto = {
	name: string;
};

export type UpdateProjectCategoryDto = {
	name?: string;
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

// ==================== Project Categories API ====================

export async function fetchProjectCategories(): Promise<ProjectCategory[]> {
	const response = await fetchWithAuth(`${API_BASE}/projects/categories/all`);
	return handleJsonResponse<ProjectCategory[]>(response);
}

export async function fetchProjectCategory(id: string): Promise<ProjectCategory> {
	const response = await fetchWithAuth(`${API_BASE}/projects/categories/${id}`);
	return handleJsonResponse<ProjectCategory>(response);
}

export async function createProjectCategory(
	data: CreateProjectCategoryDto
): Promise<ProjectCategory> {
	const response = await fetchWithAuth(`${API_BASE}/projects/categories`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<ProjectCategory>(response);
}

export async function updateProjectCategory(
	id: string,
	data: UpdateProjectCategoryDto
): Promise<ProjectCategory> {
	const response = await fetchWithAuth(`${API_BASE}/projects/categories/${id}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});
	return handleJsonResponse<ProjectCategory>(response);
}

export async function deleteProjectCategory(id: string): Promise<void> {
	const response = await fetchWithAuth(`${API_BASE}/projects/categories/${id}`, {
		method: 'DELETE'
	});
	await handleJsonResponse<unknown>(response);
}

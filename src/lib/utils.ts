import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Project } from './api/projects';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

/**
 * Generates a deterministic color from a string (e.g., user ID)
 * Returns a hex color string
 */
export function stringToColor(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}

	// Generate a color with good contrast (avoiding too light colors)
	const hue = hash % 360;
	const saturation = 65 + (hash % 20); // 65-85% saturation
	const lightness = 45 + (hash % 15); // 45-60% lightness

	return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Extracts initials from a name
 * Returns the first two uppercase letters of the first two words
 */
export function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length === 0) return '';
	if (parts.length === 1) return parts[0][0]?.toUpperCase() || '';
	return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function formatProjectLabel(project?: Project | null, fallback = 'Proyecto'): string {
	if (!project) return fallback;
	const code = project.code?.trim();
	return code ? `${code} - ${project.name}` : project.name ?? fallback;
}

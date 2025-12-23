import { get } from 'svelte/store';
import { auth } from '$lib/stores/auth';

/**
 * Check if the current user can track their own time
 * GUEST users cannot track time as they don't work in the company
 */
export function canTrackTime(): boolean {
	const state = get(auth);
	return state.activeProfile?.relation !== 'GUEST';
}

/**
 * Check if the current user can request absences
 * GUEST users cannot request absences
 */
export function canRequestAbsence(): boolean {
	return canTrackTime();
}

/**
 * Check if the current user can view their own schedule
 * GUEST users don't have a personal schedule
 */
export function canViewOwnSchedule(): boolean {
	return canTrackTime();
}

/**
 * Check if the current user can view their own calendar
 * GUEST users don't have a personal calendar
 */
export function canViewOwnCalendar(): boolean {
	return canTrackTime();
}

/**
 * Check if the current user has admin role (OWNER or ADMIN)
 */
export function isAdmin(): boolean {
	const state = get(auth);
	const role = state.activeProfile?.role ?? state.user?.role;
	return role === 'OWNER' || role === 'ADMIN';
}

/**
 * Check if the current user can access admin features
 * Both EMPLOYEE admins and GUEST admins can access admin features
 */
export function canAccessAdminFeatures(): boolean {
	return isAdmin();
}

/**
 * Check if the current user can manage other users' time entries
 * GUEST + ADMIN can manage others' time, just not their own
 */
export function canManageOthersTime(): boolean {
	return isAdmin();
}

/**
 * Check if the current user can manage absences (approve/reject)
 */
export function canManageAbsences(): boolean {
	return isAdmin();
}

/**
 * Check if the current user can view analytics
 */
export function canViewAnalytics(): boolean {
	return isAdmin();
}

/**
 * Check if the current user can manage projects
 */
export function canManageProjects(): boolean {
	return isAdmin();
}

/**
 * Check if the current user can manage users
 */
export function canManageUsers(): boolean {
	return isAdmin();
}

/**
 * Check if the current user can edit company settings
 * Only OWNER can edit settings
 */
export function canEditCompanySettings(): boolean {
	const state = get(auth);
	const role = state.activeProfile?.role ?? state.user?.role;
	return role === 'OWNER';
}

/**
 * Check if the current user is a GUEST
 */
export function isGuest(): boolean {
	const state = get(auth);
	return state.activeProfile?.relation === 'GUEST';
}

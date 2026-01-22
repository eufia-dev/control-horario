import type { UserRole } from '$lib/stores/auth';
import type { Project } from '$lib/api/projects';
import type { User } from '$lib/api/users';

/**
 * Check if a user can edit a project
 * - OWNER/ADMIN can edit any project
 * - TEAM_LEADER can only edit projects belonging to their team
 */
export function canEditProject(
	userRole: UserRole,
	userTeamId: string | null,
	project: Project
): boolean {
	if (userRole === 'OWNER' || userRole === 'ADMIN') {
		return true;
	}
	if (userRole === 'TEAM_LEADER') {
		return project.teamId !== null && project.teamId === userTeamId;
	}
	return false;
}

/**
 * Check if a user can delete a project
 * - OWNER/ADMIN can delete any project
 * - TEAM_LEADER can only delete projects belonging to their team
 */
export function canDeleteProject(
	userRole: UserRole,
	userTeamId: string | null,
	project: Project
): boolean {
	if (userRole === 'OWNER' || userRole === 'ADMIN') {
		return true;
	}
	if (userRole === 'TEAM_LEADER') {
		return project.teamId !== null && project.teamId === userTeamId;
	}
	return false;
}

/**
 * Check if a user can edit another user
 * - OWNER/ADMIN can edit any user (except OWNER can't be edited by ADMIN)
 * - TEAM_LEADER can only edit users in their team
 */
export function canEditUser(
	currentUserRole: UserRole,
	currentUserTeamId: string | null,
	targetUser: User
): boolean {
	if (currentUserRole === 'OWNER') {
		return true;
	}
	if (currentUserRole === 'ADMIN') {
		return targetUser.role !== 'OWNER';
	}
	if (currentUserRole === 'TEAM_LEADER') {
		return (
			targetUser.team?.id === currentUserTeamId &&
			targetUser.role !== 'OWNER' &&
			targetUser.role !== 'ADMIN'
		);
	}
	return false;
}

/**
 * Check if a user can delete another user
 * - OWNER can delete any user except themselves
 * - ADMIN can delete non-OWNER users
 * - TEAM_LEADER cannot delete users (only remove from team)
 */
export function canDeleteUser(
	currentUserRole: UserRole,
	currentUserTeamId: string | null,
	targetUser: User
): boolean {
	if (targetUser.role === 'OWNER') {
		return false; // Cannot delete owner
	}
	if (currentUserRole === 'OWNER') {
		return true;
	}
	if (currentUserRole === 'ADMIN') {
		return targetUser.role !== 'OWNER';
	}
	// TEAM_LEADER cannot delete users, only remove them from the team
	return false;
}

/**
 * Check if a user can manage teams (create, delete teams)
 * Only OWNER and ADMIN can manage teams
 */
export function canManageTeams(role: UserRole): boolean {
	return role === 'OWNER' || role === 'ADMIN';
}

/**
 * Check if a user can edit a team (edit team details or manage members)
 * - OWNER/ADMIN can edit any team
 * - TEAM_LEADER can only edit their own team
 */
export function canEditTeam(
	userRole: UserRole,
	userTeamId: string | null,
	teamId: string
): boolean {
	if (userRole === 'OWNER' || userRole === 'ADMIN') {
		return true;
	}
	if (userRole === 'TEAM_LEADER') {
		return teamId === userTeamId;
	}
	return false;
}

/**
 * Check if a user can access analytics
 * OWNER, ADMIN, and TEAM_LEADER can access analytics
 */
export function canAccessAnalytics(role: UserRole): boolean {
	return role === 'OWNER' || role === 'ADMIN' || role === 'TEAM_LEADER';
}

/**
 * Check if a user can access admin panel
 * OWNER, ADMIN, and TEAM_LEADER can access
 */
export function canAccessAdmin(role: UserRole): boolean {
	return role === 'OWNER' || role === 'ADMIN' || role === 'TEAM_LEADER';
}

/**
 * Check if a user can send invitations
 * Only OWNER and ADMIN can send invitations
 */
export function canSendInvitations(role: UserRole): boolean {
	return role === 'OWNER' || role === 'ADMIN';
}

/**
 * Check if a user is a full admin (OWNER or ADMIN)
 */
export function isFullAdmin(role: UserRole): boolean {
	return role === 'OWNER' || role === 'ADMIN';
}

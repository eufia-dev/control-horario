export type BadgeInfo = {
	variant: 'default' | 'secondary' | 'outline';
	label: string;
};

export function getRoleBadge(role: string): BadgeInfo {
	switch (role) {
		case 'OWNER':
			return { variant: 'default', label: 'Propietario' };
		case 'ADMIN':
			return { variant: 'default', label: 'Admin' };
		case 'TEAM_LEADER':
			return { variant: 'default', label: 'Jefe de equipo' };
		case 'AUDITOR':
			return { variant: 'outline', label: 'Auditor' };
		case 'WORKER':
		default:
			return { variant: 'secondary', label: 'Trabajador' };
	}
}

export function getRelationTypeBadge(relation: string): BadgeInfo {
	switch (relation) {
		case 'EMPLOYEE':
			return { variant: 'default', label: 'Empleado' };
		case 'CONTRACTOR':
			return { variant: 'secondary', label: 'Autónomo' };
		case 'GUEST':
			return { variant: 'outline', label: 'Invitado' };
		default:
			return { variant: 'secondary', label: relation };
	}
}

export function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('es-ES', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	});
}

export function formatCurrency(value: number): string {
	return new Intl.NumberFormat('es-ES', {
		style: 'currency',
		currency: 'EUR'
	}).format(value);
}

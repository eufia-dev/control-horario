<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import type { MonthClosingStatus } from '$lib/api/month-closing';

	type Props = {
		status: MonthClosingStatus;
		closedAt?: string | null;
		closedBy?: string | null;
	};

	let { status, closedAt = null, closedBy = null }: Props = $props();

	const statusConfig = $derived(() => {
		switch (status) {
			case 'OPEN':
				return {
					label: 'Mes abierto',
					icon: 'radio_button_unchecked',
					variant: 'outline' as const,
					className: 'border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30'
				};
			case 'CLOSED':
				return {
					label: 'Mes cerrado',
					icon: 'check_circle',
					variant: 'outline' as const,
					className: 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/30'
				};
			case 'REOPENED':
				return {
					label: 'Mes reabierto',
					icon: 'warning',
					variant: 'outline' as const,
					className: 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30'
				};
			default:
				return {
					label: 'Desconocido',
					icon: 'help',
					variant: 'outline' as const,
					className: ''
				};
		}
	});

	const formattedDate = $derived(() => {
		if (!closedAt) return null;
		return new Date(closedAt).toLocaleDateString('es-ES', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	});
</script>

<div class="flex items-center gap-2">
	<Badge variant={statusConfig().variant} class="gap-1 {statusConfig().className}">
		<span class="material-symbols-rounded text-sm!">{statusConfig().icon}</span>
		<span>{statusConfig().label}</span>
	</Badge>
	{#if status === 'CLOSED' && (closedAt || closedBy)}
		<span class="text-xs text-muted-foreground">
			{#if formattedDate()}
				el {formattedDate()}
			{/if}
			{#if closedBy}
				por {closedBy}
			{/if}
		</span>
	{/if}
</div>

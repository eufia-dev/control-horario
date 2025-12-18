<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import type { RelationType } from '$lib/stores/auth';

	type Props = {
		type: RelationType;
		class?: string;
	};

	let { type, class: className = '' }: Props = $props();

	const config: Record<
		RelationType,
		{ label: string; variant: 'default' | 'secondary' | 'outline' }
	> = {
		EMPLOYEE: { label: 'Empleado', variant: 'default' },
		CONTRACTOR: { label: 'Autónomo', variant: 'secondary' },
		GUEST: { label: 'Invitado', variant: 'outline' }
	};
</script>

<Badge variant={config[type]?.variant ?? 'outline'} class={className}>
	{config[type]?.label ?? type}
</Badge>

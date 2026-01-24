<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';

	type Props = {
		pendingCount: number;
		loading?: boolean;
		onScrollToSection?: () => void;
	};

	let { pendingCount, loading = false, onScrollToSection }: Props = $props();

	function handleClick() {
		if (onScrollToSection) {
			onScrollToSection();
		} else {
			goto(`${resolve('/config/equipo')}#join-requests`);
		}
	}
</script>

{#if !loading && pendingCount > 0}
	<Card class="w-full border-blue-500/30 bg-blue-500/5">
		<CardContent class="py-3">
			<div class="flex items-center justify-between gap-4">
				<div class="flex items-center gap-3">
					<span class="material-symbols-rounded text-blue-600 text-2xl!">person_add</span>
					<div>
						<p class="font-medium text-sm">Solicitudes de acceso pendientes</p>
						<p class="text-xs text-muted-foreground">
							Hay {pendingCount}
							{pendingCount === 1 ? 'solicitud' : 'solicitudes'} esperando aprobación
						</p>
					</div>
				</div>
				<Button variant="outline" size="sm" onclick={handleClick}>
					<Badge variant="destructive" class="mr-2">{pendingCount}</Badge>
					Revisar
				</Button>
			</div>
		</CardContent>
	</Card>
{/if}

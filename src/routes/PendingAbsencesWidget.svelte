<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { resolve } from '$app/paths';

	type Props = {
		pendingCount: number;
		loading?: boolean;
	};

	let { pendingCount, loading = false }: Props = $props();
</script>

{#if !loading && pendingCount > 0}
	<Card class="w-full border-yellow-500/30 bg-yellow-500/5">
		<CardContent class="py-3">
			<div class="flex items-center justify-between gap-4">
				<div class="flex items-center gap-3">
					<span class="material-symbols-rounded text-yellow-600 text-2xl!">pending_actions</span>
					<div>
						<p class="font-medium text-sm">Solicitudes de ausencia pendientes</p>
						<p class="text-xs text-muted-foreground">
							Hay {pendingCount}
							{pendingCount === 1 ? 'solicitud' : 'solicitudes'} esperando revisión
						</p>
					</div>
				</div>
				<Button variant="outline" size="sm" href={resolve('/admin/absences')}>
					<Badge variant="destructive" class="mr-2">{pendingCount}</Badge>
					Revisar
				</Button>
			</div>
		</CardContent>
	</Card>
{/if}

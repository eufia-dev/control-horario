<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { resolve } from '$app/paths';
	import type { CalendarDay } from '$lib/api/calendar';

	type Props = {
		missingDays: CalendarDay[];
		loading?: boolean;
	};

	let { missingDays, loading = false }: Props = $props();

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('es-ES', {
			weekday: 'short',
			day: 'numeric',
			month: 'short'
		});
	}

	const displayDays = $derived(missingDays.slice(0, 5));
	const hasMore = $derived(missingDays.length > 5);
</script>

{#if !loading && missingDays.length > 0}
	<div class="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
		<div class="flex items-start gap-3">
			<span class="material-symbols-rounded text-destructive text-2xl! shrink-0">warning</span>
			<div class="flex-1 min-w-0">
				<p class="font-medium text-destructive">
					Tienes {missingDays.length}
					{missingDays.length === 1 ? 'día' : 'días'} sin registrar
				</p>
				<ul class="mt-2 space-y-1 text-sm text-muted-foreground">
					{#each displayDays as day (day.date)}
						<li class="flex items-center gap-2">
							<span class="material-symbols-rounded text-sm!">event</span>
							<span class="capitalize">{formatDate(day.date)}</span>
						</li>
					{/each}
					{#if hasMore}
						<li class="text-muted-foreground/70">
							y {missingDays.length - 5} más...
						</li>
					{/if}
				</ul>
				<Button
					variant="outline"
					size="sm"
					href={resolve('/calendar')}
					class="mt-3 border-destructive/30 text-destructive hover:bg-destructive/10"
				>
					<span class="material-symbols-rounded text-lg! mr-2">edit_calendar</span>
					Registrar horas
				</Button>
			</div>
		</div>
	</div>
{/if}

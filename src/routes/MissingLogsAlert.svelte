<script lang="ts">
	import { Card, CardHeader, CardTitle, CardContent, CardAction } from '$lib/components/ui/card';
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
	<Card class="bg-destructive/10 border-destructive/20 w-full flex-1">
		<CardHeader class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
			<CardTitle class="text-sm font-medium text-destructive flex items-center gap-2">
				<span class="material-symbols-rounded text-lg!">warning</span>
				Tienes {missingDays.length}
				{missingDays.length === 1 ? 'día' : 'días'} sin registrar
			</CardTitle>
			<CardAction>
				<Button variant="destructive" size="sm" href={resolve('/calendar')}>
					<span class="material-symbols-rounded text-lg! mr-2">edit_calendar</span>
					Registrar horas
				</Button>
			</CardAction>
		</CardHeader>
		<CardContent>
			<ul class="space-y-1 text-sm text-muted-foreground">
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
		</CardContent>
	</Card>
{/if}

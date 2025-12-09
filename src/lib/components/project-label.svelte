<script lang="ts">
	import type { Project } from '$lib/api/projects';
	import { cn } from '$lib/utils';

	export let project: Project | null | undefined;
	export let fallback = 'Proyecto';
	export let truncate = false;
	export let className: string | undefined = undefined;

	$: code = project?.code?.trim();
	$: name = project?.name ?? fallback;
</script>

<span
	class={cn(
		'inline-flex items-center gap-1 text-left',
		truncate ? 'min-w-0' : 'flex-wrap',
		className
	)}
>
	{#if code}
		<span class={cn('font-semibold shrink-0', truncate ? 'whitespace-normal' : 'whitespace-normal')}>
			{code}
		</span>
		<span class="text-muted-foreground">-</span>
	{/if}
	<span class={cn(truncate ? 'truncate min-w-0' : 'whitespace-normal wrap-break-word')}>{name}</span>
</span>


<script lang="ts">
	import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';
	import { cn } from '$lib/utils';

	type ProjectLike = {
		name?: string;
		code?: string;
	};

	export let project: ProjectLike | null | undefined;
	export let fallback = 'Proyecto';
	export let className: string | undefined = undefined;

	$: code = project?.code?.trim();
	$: name = project?.name ?? fallback;
	$: fullLabel = code ? `${code} - ${name}` : name;
</script>

<Tooltip ignoreNonKeyboardFocus>
	<TooltipTrigger
		class={cn('inline-flex items-center gap-1 text-left min-w-0 cursor-default', className)}
	>
		{#if code}
			<span class="font-semibold shrink-0">{code}</span>
			<span class="text-muted-foreground">-</span>
		{/if}
		<span class="truncate min-w-0">{name}</span>
	</TooltipTrigger>
	<TooltipContent>
		<p>{fullLabel}</p>
	</TooltipContent>
</Tooltip>

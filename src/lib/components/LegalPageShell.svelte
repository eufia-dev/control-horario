<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		description: string;
		version: string;
		lastUpdated: string;
		children?: Snippet;
	};

	let { title, description, version, lastUpdated, children }: Props = $props();

	function goBack() {
		if (window.history.length > 1) {
			window.history.back();
			return;
		}
		goto(resolve('/'));
	}
</script>

<div class="grow bg-background px-4 py-8">
	<div class="max-w-4xl mx-auto space-y-6">
		<Button
			variant="ghost"
			size="sm"
			aria-label="Volver"
			onclick={goBack}
			class="text-muted-foreground"
		>
			<span class="material-symbols-rounded text-xl!">arrow_back</span>
			Volver
		</Button>

		<section class="rounded-xl border border-border bg-card p-6 md:p-8 shadow-sm space-y-6">
			<header class="space-y-3">
				<h1 class="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
				<p class="text-sm md:text-base text-muted-foreground">{description}</p>
				<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
					<span>Versión: {version}</span>
					<span>Última actualización: {lastUpdated}</span>
				</div>
			</header>

			<div class="space-y-5 text-sm leading-relaxed">
				{@render children?.()}
			</div>
		</section>
	</div>
</div>

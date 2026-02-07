<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { hasProjectsFeature } from '$lib/stores/auth';

	let { children } = $props();

	type TabValue = 'projects' | 'users';

	const tabs: { value: TabValue; label: string; icon: string }[] = [
		{ value: 'projects', label: 'Proyectos', icon: 'work' },
		{ value: 'users', label: 'Usuarios', icon: 'group' }
	];

	function isActiveTab(tabValue: TabValue): boolean {
		const currentPath = $page.url.pathname;
		return currentPath.startsWith(`/analytics/${tabValue}`);
	}
</script>

<div class="grow flex flex-col gap-6 p-6">
	<!-- Header with title and inline tabs on md -->
	<div
		class="flex flex-col gap-4 xl:relative md:flex-row md:items-center md:justify-center md:gap-0"
	>
		<div class="flex items-center gap-2 md:absolute md:left-0">
			<Button variant="ghost" size="sm" onclick={() => goto(resolve('/'))}>
				<span class="material-symbols-rounded text-lg!">arrow_back</span>
			</Button>
			<span class="material-symbols-rounded text-3xl!">analytics</span>
			<h1 class="text-2xl font-semibold tracking-tight">Analíticas</h1>
		</div>
		{#if $hasProjectsFeature}
			<div class="overflow-x-auto">
				<nav
					class="bg-muted text-muted-foreground inline-flex w-fit items-center justify-center rounded-lg p-[3px]"
				>
					{#each tabs as tab (tab.value)}
						<a
							href={resolve(`/analytics/${tab.value}`)}
							data-state={isActiveTab(tab.value) ? 'active' : 'inactive'}
							class="data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2 py-1 text-sm font-medium transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] data-[state=active]:shadow-sm"
						>
							<span class="material-symbols-rounded text-lg!">{tab.icon}</span>
							<span>{tab.label}</span>
						</a>
					{/each}
				</nav>
			</div>
		{/if}
	</div>

	<div class="w-full mx-auto lg:px-6">
		<div class="flex flex-col gap-6">
			{@render children()}
		</div>
	</div>
</div>

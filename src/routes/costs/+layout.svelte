<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { canAccessCosts as canAccessCostsStore } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';

	let { children } = $props();

	let canAccessCosts = $state(false);

	$effect(() => {
		const unsub = canAccessCostsStore.subscribe((value) => {
			canAccessCosts = value ?? false;
		});
		return unsub;
	});

	type TabValue = 'anual' | 'mensual';

	const tabs: { value: TabValue; label: string; icon: string }[] = [
		{ value: 'anual', label: 'Anual', icon: 'grid_on' },
		{ value: 'mensual', label: 'Mensual', icon: 'calendar_month' }
	];

	function isActiveTab(tabValue: TabValue): boolean {
		const currentPath = $page.url.pathname;
		return currentPath.startsWith(`/costs/${tabValue}`);
	}
</script>

{#if canAccessCosts}
	<div class="grow flex flex-col gap-6 p-6">
		<!-- Header with title and inline tabs on md -->
		<div
			class="flex flex-col gap-4 md:relative md:flex-row md:items-center md:justify-center md:gap-0"
		>
			<div class="flex items-center gap-2 md:absolute md:left-0">
				<Button variant="ghost" size="sm" onclick={() => goto(resolve('/'))}>
					<span class="material-symbols-rounded text-lg!">arrow_back</span>
				</Button>
				<span class="material-symbols-rounded text-3xl!">account_balance</span>
				<h1 class="text-2xl font-semibold tracking-tight">Costes</h1>
			</div>
			<div class="overflow-x-auto">
				<nav
					class="bg-muted text-muted-foreground inline-flex w-fit items-center justify-center rounded-lg p-[3px]"
				>
					{#each tabs as tab (tab.value)}
						<a
							href={resolve(`/costs/${tab.value}`)}
							data-state={isActiveTab(tab.value) ? 'active' : 'inactive'}
							class="data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2 py-1 text-sm font-medium transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] data-[state=active]:shadow-sm"
						>
							<span class="material-symbols-rounded text-lg!">{tab.icon}</span>
							<span>{tab.label}</span>
						</a>
					{/each}
				</nav>
			</div>
		</div>

		<div class="w-full mx-auto px-10">
			<div class="flex flex-col gap-4">
				{@render children()}
			</div>
		</div>
	</div>
{:else}
	<div class="container mx-auto px-4 py-8">
		<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
			<span class="material-symbols-rounded text-6xl! mb-4">lock</span>
			<h2 class="text-xl font-semibold mb-2">Acceso restringido</h2>
			<p>No tienes permisos para acceder a los costes.</p>
			<Button variant="outline" class="mt-4" onclick={() => goto(resolve('/'))}>
				<span class="material-symbols-rounded mr-2 text-lg!">arrow_back</span>
				Volver al inicio
			</Button>
		</div>
	</div>
{/if}

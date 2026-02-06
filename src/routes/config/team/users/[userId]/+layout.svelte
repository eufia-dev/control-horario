<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { canAccessAdmin as canAccessAdminStore } from '$lib/stores/auth';
	import { fetchUsers, type User } from '$lib/api/users';

	let { children } = $props();

	let canAccessAdmin = $state(false);

	$effect(() => {
		const unsub = canAccessAdminStore.subscribe((value) => {
			canAccessAdmin = value;
		});
		return unsub;
	});

	// Get userId from route params
	let userId = $derived($page.params.userId);

	// User data
	let user = $state<User | null>(null);
	let loadingUser = $state(true);
	let userError = $state<string | null>(null);

	async function loadUser() {
		loadingUser = true;
		userError = null;
		try {
			const users = await fetchUsers();
			user = users.find((u) => u.id === userId) ?? null;
			if (!user) {
				userError = 'Usuario no encontrado';
			}
		} catch (e) {
			userError = e instanceof Error ? e.message : 'Error al cargar usuario';
		} finally {
			loadingUser = false;
		}
	}

	onMount(() => {
		loadUser();
	});

	type TabValue = 'history' | 'calendar' | 'audit';

	const tabs: { value: TabValue; label: string; icon: string }[] = [
		{ value: 'history', label: 'Historial', icon: 'history' },
		{ value: 'calendar', label: 'Calendario', icon: 'calendar_month' },
		{ value: 'audit', label: 'Auditoría', icon: 'policy' }
	];

	function isActiveTab(tabValue: TabValue): boolean {
		const currentPath = $page.url.pathname;
		return currentPath.endsWith(`/${tabValue}`);
	}
</script>

{#if canAccessAdmin}
	<div class="grow flex flex-col gap-6 py-4">
		<!-- Header -->
		<div class="flex items-center gap-2">
			<Button variant="ghost" size="sm" onclick={() => goto(resolve('/config/team'))}>
				<span class="material-symbols-rounded text-lg!">arrow_back</span>
			</Button>
			<span class="material-symbols-rounded text-3xl!">person</span>
			{#if loadingUser}
				<Skeleton class="h-8 w-48" />
			{:else if user}
				<h1 class="text-2xl font-semibold tracking-tight">{user.name}</h1>
				<Badge variant="secondary" class="ml-2">{user.email}</Badge>
			{:else}
				<h1 class="text-2xl font-semibold tracking-tight text-destructive">
					Usuario no encontrado
				</h1>
			{/if}
		</div>

		{#if userError}
			<div class="w-full max-w-6xl mx-auto">
				<div class="flex flex-col items-center justify-center py-12 text-destructive">
					<span class="material-symbols-rounded text-4xl! mb-2">error</span>
					<p>{userError}</p>
					<Button variant="outline" class="mt-4" onclick={() => goto(resolve('/config/team'))}>
						Volver al equipo
					</Button>
				</div>
			</div>
		{:else}
			<div class="w-full max-w-6xl mx-auto">
				<div class="mb-4 overflow-x-auto">
					<nav
						class="bg-muted text-muted-foreground inline-flex w-fit items-center justify-center rounded-lg p-[3px]"
					>
						{#each tabs as tab (tab.value)}
							<a
								href={resolve(`/config/team/users/${userId}/${tab.value}`)}
								data-state={isActiveTab(tab.value) ? 'active' : 'inactive'}
								class="data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2 py-1 text-sm font-medium transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] data-[state=active]:shadow-sm"
							>
								<span class="material-symbols-rounded text-lg!">{tab.icon}</span>
								<span>{tab.label}</span>
							</a>
						{/each}
					</nav>
				</div>

				<div class="flex flex-col gap-6">
					{@render children()}
				</div>
			</div>
		{/if}
	</div>
{/if}

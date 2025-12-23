<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { auth, profiles, activeProfile, type Profile } from '$lib/stores/auth';
	import { switchProfile, setActiveProfileId } from '$lib/auth';
	import { fetchAuthPendingInvitations, type AuthPendingInvitation } from '$lib/api/onboarding';
	import * as Popover from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';

	let isOpen = $state(false);
	let isSwitching = $state(false);
	let pendingInvitations = $state<AuthPendingInvitation[]>([]);
	let loadedInvitations = $state(false);

	const roleLabels: Record<string, string> = {
		OWNER: 'Propietario',
		ADMIN: 'Administrador',
		WORKER: 'Trabajador',
		AUDITOR: 'Auditor'
	};

	const relationTypeConfig: Record<
		string,
		{ label: string; variant: 'default' | 'secondary' | 'outline' }
	> = {
		EMPLOYEE: { label: 'Empleado', variant: 'default' },
		CONTRACTOR: { label: 'Autónomo', variant: 'secondary' },
		GUEST: { label: 'Invitado', variant: 'outline' }
	};

	async function loadPendingInvitations() {
		if (loadedInvitations) return;
		try {
			pendingInvitations = await fetchAuthPendingInvitations();
			loadedInvitations = true;
		} catch (e) {
			console.error('Failed to load pending invitations:', e);
		}
	}

	async function handleSwitch(profile: Profile) {
		if (profile.id === $activeProfile?.id) {
			isOpen = false;
			return;
		}

		isSwitching = true;
		try {
			// Validate switch with backend
			await switchProfile(profile.id);

			// Update localStorage
			setActiveProfileId(profile.id);

			// Update store
			auth.setActiveProfile(profile);

			// Close popover
			isOpen = false;

			// Reload to clear all cached data
			window.location.reload();
		} catch (error) {
			console.error('Failed to switch profile:', error);
			// Show error toast or message
		} finally {
			isSwitching = false;
		}
	}

	function handleManageProfiles() {
		isOpen = false;
		goto(resolve('/profile'));
	}

	onMount(() => {
		loadPendingInvitations();
	});
</script>

<Popover.Root bind:open={isOpen}>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button
				variant="ghost"
				size="sm"
				class="gap-2 max-w-[200px] relative"
				disabled={isSwitching}
				{...props}
			>
				<span class="material-symbols-rounded text-lg!">swap_horiz</span>
				<span class="truncate hidden sm:inline">{$activeProfile?.company.name ?? 'Empresa'}</span>
				<span class="material-symbols-rounded text-base!">expand_more</span>
				{#if pendingInvitations.length > 0}
					<span
						class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-medium"
					>
						{pendingInvitations.length}
					</span>
				{/if}
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-80 p-0" align="end">
		<div class="p-3 border-b border-border">
			<div class="text-sm font-medium">Cambiar perfil</div>
			<div class="text-xs text-muted-foreground">Selecciona la empresa con la que trabajar</div>
		</div>

		{#if pendingInvitations.length > 0}
			<div class="p-2 border-b border-border bg-primary/5">
				<button
					type="button"
					class="w-full flex items-center gap-3 p-2 rounded-md hover:bg-primary/10 transition-colors text-left"
					onclick={handleManageProfiles}
				>
					<div
						class="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary shrink-0"
					>
						<span class="material-symbols-rounded text-xl!">mail</span>
					</div>
					<div class="flex-1 min-w-0">
						<div class="text-sm font-medium">Invitaciones pendientes</div>
						<div class="text-xs text-muted-foreground">
							{pendingInvitations.length}
							{pendingInvitations.length === 1 ? 'invitación' : 'invitaciones'}
						</div>
					</div>
					<Badge variant="default" class="text-xs">{pendingInvitations.length}</Badge>
				</button>
			</div>
		{/if}

		<div class="p-2 max-h-[250px] overflow-y-auto">
			{#each $profiles as profile (profile.id)}
				<button
					type="button"
					class="w-full flex items-center gap-3 p-2 rounded-md transition-colors text-left
						{$activeProfile?.id === profile.id ? 'bg-primary/10' : 'hover:bg-muted'}"
					onclick={() => handleSwitch(profile)}
					disabled={isSwitching}
				>
					<!-- Company Logo or Initial -->
					<div
						class="flex items-center justify-center w-10 h-10 rounded-md bg-muted text-sm font-semibold shrink-0"
					>
						{#if profile.company.logoUrl}
							<img
								src={profile.company.logoUrl}
								alt={profile.company.name}
								class="w-full h-full object-cover rounded-md"
							/>
						{:else}
							{profile.company.name.charAt(0).toUpperCase()}
						{/if}
					</div>

					<div class="flex-1 min-w-0">
						<div class="text-sm font-medium truncate">{profile.company.name}</div>
						<div class="flex items-center gap-1.5 mt-0.5">
							<span class="text-xs text-muted-foreground">
								{roleLabels[profile.role] ?? profile.role}
							</span>
							{#if profile.relation === 'GUEST'}
								<Badge variant="outline" class="text-[10px] px-1 py-0">
									{relationTypeConfig[profile.relation]?.label}
								</Badge>
							{/if}
						</div>
					</div>

					{#if $activeProfile?.id === profile.id}
						<span class="material-symbols-rounded text-primary text-lg">check</span>
					{/if}
				</button>
			{/each}
		</div>

		<div class="p-2 border-t border-border">
			<button
				type="button"
				class="w-full flex items-center justify-center gap-2 p-2 rounded-md hover:bg-muted transition-colors text-sm text-muted-foreground"
				onclick={handleManageProfiles}
			>
				<span class="material-symbols-rounded text-lg!">add_business</span>
				<span>Gestionar empresas</span>
			</button>
		</div>
	</Popover.Content>
</Popover.Root>

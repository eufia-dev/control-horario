<script lang="ts">
	import { type Profile } from '$lib/stores/auth';
	import { setActiveProfileId } from '$lib/auth';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';

	type Props = {
		open: boolean;
		profiles: Profile[];
		onSelect?: (profile: Profile) => void;
	};

	let { open = $bindable(), profiles, onSelect }: Props = $props();

	let rememberChoice = $state(true);
	let selectedProfileId = $state<string | null>(null);

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

	function handleSelect(profile: Profile) {
		selectedProfileId = profile.id;
	}

	function handleConfirm() {
		const selected = profiles.find((p) => p.id === selectedProfileId);
		if (!selected) return;

		if (rememberChoice) {
			setActiveProfileId(selected.id);
		}

		open = false;
		onSelect?.(selected);
	}

	$effect(() => {
		if (open && profiles.length > 0 && !selectedProfileId) {
			selectedProfileId = profiles[0].id;
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<span class="material-symbols-rounded text-primary">switch_account</span>
				Selecciona tu perfil
			</Dialog.Title>
			<Dialog.Description>
				Tienes acceso a varias empresas. Selecciona con cuál quieres trabajar.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-3 py-4">
			{#each profiles as profile (profile.id)}
				<button
					type="button"
					class="w-full flex items-center gap-4 p-4 rounded-lg border transition-colors text-left
						{selectedProfileId === profile.id
						? 'border-primary bg-primary/5'
						: 'border-border hover:border-muted-foreground/50 hover:bg-muted/50'}"
					onclick={() => handleSelect(profile)}
				>
					<!-- Company Logo or Initial -->
					<div
						class="flex items-center justify-center w-12 h-12 rounded-lg bg-muted text-lg font-semibold shrink-0"
					>
						{#if profile.company.logoUrl}
							<img
								src={profile.company.logoUrl}
								alt={profile.company.name}
								class="w-full h-full object-cover rounded-lg"
							/>
						{:else}
							{profile.company.name.charAt(0).toUpperCase()}
						{/if}
					</div>

					<div class="flex-1 min-w-0">
						<div class="font-medium truncate">{profile.company.name}</div>
						<div class="flex items-center gap-2 mt-1">
							<span class="text-sm text-muted-foreground">
								{roleLabels[profile.role] ?? profile.role}
							</span>
							<Badge variant={relationTypeConfig[profile.relationType]?.variant ?? 'outline'}>
								{relationTypeConfig[profile.relationType]?.label ?? profile.relationType}
							</Badge>
						</div>
					</div>

					{#if selectedProfileId === profile.id}
						<span class="material-symbols-rounded text-primary text-2xl">check_circle</span>
					{/if}
				</button>
			{/each}
		</div>

		<div class="flex items-center gap-3 pb-4">
			<Switch id="remember-profile" bind:checked={rememberChoice} />
			<Label for="remember-profile" class="text-sm cursor-pointer">Recordar mi elección</Label>
		</div>

		<Dialog.Footer>
			<Button onclick={handleConfirm} disabled={!selectedProfileId} class="w-full sm:w-auto">
				Continuar
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

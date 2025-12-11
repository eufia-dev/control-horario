<script lang="ts">
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Label } from '$lib/components/ui/label';
	import { fade } from 'svelte/transition';

	export let pendingInvitations: { id: string; companyName: string; token: string }[] = [];
	export let showOtherOptions = false;
	export let userToggledOptions = false;
	export let selectedPath: 'create' | 'join' | '' = '';
	export let errorMessage: string | null = null;
	export let isAcceptingInvitation = false;
	export let acceptingInvitationId: string | null = null;
	export let onAcceptInvitation: (token: string, invitationId: string) => void;
	export let onBack: () => void;
	export let onContinue: () => void;
</script>

<Card class="shadow-lg max-w-xl w-full">
	<CardContent class="space-y-6">
		{#if pendingInvitations.length === 0}
			<div class="text-center py-4">
				<span class="material-symbols-rounded text-4xl text-muted-foreground/50 mb-2">mail</span>
				<p class="text-sm text-muted-foreground">
					No encontramos invitaciones pendientes en tu cuenta.
				</p>
			</div>
		{:else}
			<div>
				{#each pendingInvitations as invitation (invitation.id)}
					<div
						class="relative rounded-xl border-2 border-primary/20 bg-primary/3 p-5 transition-all hover:border-primary/40"
					>
						<div class="flex items-center gap-4">
							<div
								class="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary shrink-0"
							>
								<span class="material-symbols-rounded text-2xl!">domain</span>
							</div>
							<div class="flex-1 min-w-0">
								<h3 class="text-lg font-semibold text-foreground truncate">
									{invitation.companyName}
								</h3>
								<p class="text-sm text-muted-foreground">Te invitaron a unirte a esta empresa</p>
							</div>
							<Button
								size="lg"
								onclick={() => onAcceptInvitation(invitation.token, invitation.id)}
								disabled={isAcceptingInvitation}
								class="shrink-0"
							>
								{#if isAcceptingInvitation && acceptingInvitationId === invitation.id}
									<span class="material-symbols-rounded animate-spin mr-2">progress_activity</span>
									Aceptando...
								{:else}
									<span class="material-symbols-rounded mr-2">check_circle</span>
									Aceptar
								{/if}
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
		{#if errorMessage}
			<p class="text-sm text-destructive">{errorMessage}</p>
		{/if}

		<div class="relative flex items-center">
			<Separator />
			{#if pendingInvitations.length > 0}
				<div class="absolute inset-0 flex items-center justify-center">
					<span class="bg-card px-3 text-xs text-muted-foreground uppercase tracking-wider"
						>o bien</span
					>
				</div>
			{/if}
		</div>

		<div class="space-y-4">
			<div class="flex items-center justify-between gap-3">
				<div>
					<p class="text-sm text-muted-foreground">
						Crea tu propia empresa o solicita unirte a otra distinta.
					</p>
				</div>
				{#if pendingInvitations.length > 0}
					<Button
						variant="ghost"
						size="sm"
						onclick={() => {
							showOtherOptions = !showOtherOptions;
							userToggledOptions = true;
						}}
						class="text-muted-foreground hover:text-foreground"
					>
						{showOtherOptions ? 'Ocultar' : 'Ver opciones'}
					</Button>
				{/if}
			</div>

			{#if showOtherOptions || pendingInvitations.length === 0}
				<div class="space-y-4" transition:fade={{ duration: 150 }}>
					<RadioGroup.Root bind:value={selectedPath} class="grid gap-3">
						<div>
							<RadioGroup.Item value="join" id="join" class="peer sr-only" />
							<Label
								for="join"
								class="flex items-center gap-3 rounded-lg border border-border bg-background p-3.5 hover:bg-accent/50 cursor-pointer transition-all
									peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
							>
								<div
									class="flex items-center justify-center w-9 h-9 rounded-lg bg-muted text-muted-foreground shrink-0"
								>
									<span class="material-symbols-rounded text-xl!">group_add</span>
								</div>
								<div class="flex flex-col">
									<span class="font-medium text-sm">Unirse a una empresa</span>
									<span class="text-xs text-muted-foreground">
										Busca por nombre o código de invitación
									</span>
								</div>
							</Label>
						</div>
						<div>
							<RadioGroup.Item value="create" id="create" class="peer sr-only" />
							<Label
								for="create"
								class="flex items-center gap-3 rounded-lg border border-border bg-background p-3.5 hover:bg-accent/50 cursor-pointer transition-all
									peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
							>
								<div
									class="flex items-center justify-center w-9 h-9 rounded-lg bg-muted text-muted-foreground shrink-0"
								>
									<span class="material-symbols-rounded text-xl!">add_business</span>
								</div>
								<div class="flex flex-col">
									<span class="font-medium text-sm">Crear una nueva empresa</span>
									<span class="text-xs text-muted-foreground">
										Configura tu empresa y gestiona tu equipo
									</span>
								</div>
							</Label>
						</div>
					</RadioGroup.Root>
				</div>
			{/if}
		</div>
	</CardContent>
	<CardFooter class="flex items-center justify-between gap-3">
		<Button variant="ghost" onclick={onBack}>
			<span class="material-symbols-rounded text-lg! mr-2">arrow_back</span>
			Volver
		</Button>
		<Button onclick={onContinue} disabled={!selectedPath}>
			Continuar
			<span class="material-symbols-rounded text-lg! ml-2">arrow_forward</span>
		</Button>
	</CardFooter>
</Card>

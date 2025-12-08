<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import { auth } from '$lib/stores/auth';
import { acceptInvitation } from '$lib/api/onboarding';
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter
} from '$lib/components/ui/card';
import { Button } from '$lib/components/ui/button';
import * as RadioGroup from '$lib/components/ui/radio-group';
import { Label } from '$lib/components/ui/label';
import { Input } from '$lib/components/ui/input';
import { Field, FieldLabel, FieldError } from '$lib/components/ui/field';
import OnboardingSteps from '$lib/components/onboarding-steps.svelte';
import { fly, fade } from 'svelte/transition';

const steps = [{ label: 'Tu perfil' }, { label: 'Elige una opción' }];

	let selectedPath = $state<'create' | 'join' | ''>('');
	let pendingInvitations = $state<typeof $auth.pendingInvitations>([]);
	let isAcceptingInvitation = $state(false);
	let acceptingInvitationId = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let userName = $state($page.url.searchParams.get('userName') ?? '');
	let showOtherOptions = $state(false);
	let userToggledOptions = $state(false);
	let stage = $state(0); // 0 = name, 1 = options
	let transitionDirection = $state<'forward' | 'backward'>('forward');

	// Subscribe to auth store to get pending invitations and prefill name
	$effect(() => {
		const unsub = auth.subscribe((state) => {
			pendingInvitations = state.pendingInvitations;
			if (!userName.trim() && state.user?.name) {
				userName = state.user.name;
			}
			if (!userToggledOptions) {
				showOtherOptions = state.pendingInvitations.length === 0;
			}
		});
		return unsub;
	});

	const handleAcceptInvitation = async (token: string, invitationId: string) => {
		if (isAcceptingInvitation) return;

		if (!userName.trim()) {
			errorMessage = 'Tu nombre es obligatorio para aceptar la invitación';
			return;
		}

		isAcceptingInvitation = true;
		acceptingInvitationId = invitationId;
		errorMessage = null;

		try {
			await acceptInvitation(token, userName.trim());
			// Invitation accepted successfully, redirect to dashboard
			await goto('/');
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Error al aceptar la invitación';
		} finally {
			isAcceptingInvitation = false;
			acceptingInvitationId = null;
		}
	};

const handleContinue = () => {
	if (stage === 0) {
		if (!userName.trim()) {
			errorMessage = 'Tu nombre es obligatorio para continuar';
			return;
		}
		errorMessage = null;
		transitionDirection = 'forward';
		stage = 1;
		return;
	}

	const withUserName = (path: string) => {
		const params = new URLSearchParams();
		params.set('userName', userName.trim());
		return `${path}?${params.toString()}`;
	};

	if (selectedPath === 'create') {
		goto(withUserName('/onboarding/create-company'));
	} else if (selectedPath === 'join') {
		goto(withUserName('/onboarding/join'));
	}
};
</script>

<div class="grow flex items-center justify-center bg-background px-4 py-8">
	<div class="w-full max-w-2xl space-y-6">
		<OnboardingSteps {steps} currentStep={stage} />

		{#key stage}
			<div
				in:fly={{
					x: transitionDirection === 'forward' ? 160 : -160,
					opacity: 0,
					duration: 260
				}}
				out:fly={{
					x: transitionDirection === 'forward' ? -160 : 160,
					opacity: 0,
					duration: 220
				}}
			>
				<Card class="shadow-lg max-w-xl mx-auto">
					{#if stage === 0}
						<CardHeader>
							<CardTitle class="text-xl flex items-center gap-2">
								<span class="material-symbols-rounded text-primary">badge</span>
								Perfil
							</CardTitle>
						</CardHeader>
						<CardContent class="space-y-4">
							<Field>
								<FieldLabel>
									<Label for="user-name">Nombre *</Label>
								</FieldLabel>
								<Input
									id="user-name"
									type="text"
									placeholder="Juan García"
									bind:value={userName}
									autocomplete="name"
								/>
								{#if errorMessage && !userName.trim()}
									<FieldError class="text-sm">{errorMessage}</FieldError>
								{/if}
							</Field>
						</CardContent>
						<CardFooter class="flex justify-end gap-3">
							<Button onclick={handleContinue} disabled={!userName.trim()}>
								Siguiente
								<span class="material-symbols-rounded text-lg! ml-2">arrow_forward</span>
							</Button>
						</CardFooter>
					{:else}
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
												<div class="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary shrink-0">
													<span class="material-symbols-rounded text-2xl!">domain</span>
												</div>
												<div class="flex-1 min-w-0">
													<h3 class="text-lg font-semibold text-foreground truncate">{invitation.companyName}</h3>
													<p class="text-sm text-muted-foreground">
														Te invitaron a unirte a esta empresa
													</p>
												</div>
												<Button
													size="lg"
													onclick={() => handleAcceptInvitation(invitation.token, invitation.id)}
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

							<div class="relative">
								<div class="absolute inset-0 flex items-center">
									<div class="w-full border-t border-border"></div>
								</div>
								<div class="relative flex justify-center">
									<span class="bg-card px-3 text-xs text-muted-foreground uppercase tracking-wider">o bien</span>
								</div>
							</div>

							<div class="-mt-2 space-y-4">
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
									<div class="space-y-4" in:fade={{ duration: 150 }}>
										<RadioGroup.Root bind:value={selectedPath} class="grid gap-3">
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
														<span class="font-medium text-sm">Unirse a otra empresa</span>
														<span class="text-xs text-muted-foreground">
															Busca por nombre o código de invitación
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
							<Button
								variant="ghost"
								onclick={() => {
									transitionDirection = 'backward';
									stage = 0;
								}}
							>
								<span class="material-symbols-rounded text-lg! mr-2">arrow_back</span>
								Volver
							</Button>
							<Button onclick={handleContinue} disabled={!selectedPath}>
								Continuar
								<span class="material-symbols-rounded text-lg! ml-2">arrow_forward</span>
							</Button>
						</CardFooter>
					{/if}
				</Card>
			</div>
		{/key}
	</div>
</div>
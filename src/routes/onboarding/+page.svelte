<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import { logout } from '$lib/auth';
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
	import { Badge } from '$lib/components/ui/badge';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Label } from '$lib/components/ui/label';
	import OnboardingSteps from '$lib/components/onboarding-steps.svelte';

	const steps = [{ label: 'Elige una opción' }, { label: 'Completa el proceso' }];

	let selectedPath = $state<'create' | 'join' | null>(null);
	let pendingInvitations = $state<typeof $auth.pendingInvitations>([]);
	let isAcceptingInvitation = $state(false);
	let acceptingInvitationId = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);

	// Subscribe to auth store to get pending invitations
	$effect(() => {
		const unsub = auth.subscribe((state) => {
			pendingInvitations = state.pendingInvitations;
		});
		return unsub;
	});

	const handleAcceptInvitation = async (token: string, invitationId: string) => {
		if (isAcceptingInvitation) return;

		isAcceptingInvitation = true;
		acceptingInvitationId = invitationId;
		errorMessage = null;

		try {
			await acceptInvitation(token);
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
		if (selectedPath === 'create') {
			goto('/onboarding/create-company');
		} else if (selectedPath === 'join') {
			goto('/onboarding/join');
		}
	};

	const handleLogout = async () => {
		await logout();
		await goto('/login');
	};
</script>

<div class="grow flex items-center justify-center bg-background px-4 py-8">
	<div class="w-full max-w-2xl">
		<OnboardingSteps {steps} currentStep={0} />

		<!-- Pending Invitations Section -->
		{#if pendingInvitations.length > 0}
			<Card class="mb-6">
				<CardHeader>
					<CardTitle class="text-xl flex items-center gap-2">
						<span class="material-symbols-rounded text-primary">mail</span>
						Invitaciones pendientes
					</CardTitle>
					<CardDescription>Has sido invitado a unirte a las siguientes empresas</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3">
					{#each pendingInvitations as invitation (invitation.id)}
						<div
							class="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
						>
							<div class="flex flex-col gap-1">
								<span class="font-medium">{invitation.companyName}</span>
								<div class="flex items-center gap-2">
									<Badge variant="secondary">{invitation.role}</Badge>
									<span class="text-xs text-muted-foreground">
										Expira: {new Date(invitation.expiresAt).toLocaleDateString('es-ES')}
									</span>
								</div>
							</div>
							<Button
								size="sm"
								onclick={() => handleAcceptInvitation(invitation.token, invitation.id)}
								disabled={isAcceptingInvitation}
							>
								{#if isAcceptingInvitation && acceptingInvitationId === invitation.id}
									Aceptando...
								{:else}
									Aceptar
								{/if}
							</Button>
						</div>
					{/each}
					{#if errorMessage}
						<p class="text-sm text-destructive mt-2">{errorMessage}</p>
					{/if}
				</CardContent>
			</Card>
		{/if}

		<!-- Path Selection Card -->
		<Card>
			<CardHeader>
				<CardTitle class="text-xl">Bienvenido a Control Horario</CardTitle>
				<CardDescription>
					{#if pendingInvitations.length > 0}
						También puedes crear tu propia empresa o solicitar unirte a una existente
					{:else}
						Para comenzar, elige cómo quieres configurar tu cuenta
					{/if}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<RadioGroup.Root bind:value={selectedPath} class="grid gap-4">
					<div>
						<RadioGroup.Item value="create" id="create" class="peer sr-only" />
						<Label
							for="create"
							class="flex items-start gap-4 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors
								peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
						>
							<div
								class="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary shrink-0"
							>
								<span class="material-symbols-rounded text-2xl!">add_business</span>
							</div>
							<div class="flex flex-col gap-1">
								<span class="font-semibold">Crear una nueva empresa</span>
								<span class="text-sm text-muted-foreground">
									Configura tu propia empresa y gestiona tu equipo de trabajo
								</span>
							</div>
						</Label>
					</div>

					<div>
						<RadioGroup.Item value="join" id="join" class="peer sr-only" />
						<Label
							for="join"
							class="flex items-start gap-4 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors
								peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
						>
							<div
								class="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary shrink-0"
							>
								<span class="material-symbols-rounded text-2xl!">group_add</span>
							</div>
							<div class="flex flex-col gap-1">
								<span class="font-semibold">Unirse a una empresa existente</span>
								<span class="text-sm text-muted-foreground">
									Busca una empresa por nombre o introduce un código de invitación
								</span>
							</div>
						</Label>
					</div>
				</RadioGroup.Root>
			</CardContent>
			<CardFooter class="flex justify-between">
				<Button variant="ghost" onclick={handleLogout}>
					<span class="material-symbols-rounded text-lg! mr-2">logout</span>
					Cerrar sesión
				</Button>
				<Button onclick={handleContinue} disabled={!selectedPath}>
					Continuar
					<span class="material-symbols-rounded text-lg! ml-2">arrow_forward</span>
				</Button>
			</CardFooter>
		</Card>
	</div>
</div>

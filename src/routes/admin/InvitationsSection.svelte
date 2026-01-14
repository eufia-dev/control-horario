<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';
	import InvitationFormModal from '$lib/components/InvitationFormModal.svelte';
	import InvitationDeleteDialog from './InvitationDeleteDialog.svelte';
	import { fetchInvitations, type Invitation } from '$lib/api/invitations';
	import { formatDate, getRoleBadge, getRelationTypeBadge } from './helpers';

	let invitations = $state<Invitation[]>([]);
	let loadingInvitations = $state(true);
	let invitationsError = $state<string | null>(null);
	let searchQuery = $state('');

	const filteredInvitations = $derived(
		invitations.filter((invitation) => {
			if (!searchQuery.trim()) return true;
			const query = searchQuery.toLowerCase();
			return invitation.email.toLowerCase().includes(query);
		})
	);

	let invitationFormModalOpen = $state(false);
	let invitationDeleteDialogOpen = $state(false);
	let selectedInvitation = $state<Invitation | null>(null);

	const pendingInvitationsCount = $derived(
		invitations.filter((i) => !i.usedAt && new Date(i.expiresAt) >= new Date()).length
	);

	async function loadInvitations() {
		loadingInvitations = true;
		invitationsError = null;
		try {
			invitations = await fetchInvitations();
		} catch (e) {
			invitationsError = e instanceof Error ? e.message : 'Error desconocido';
		} finally {
			loadingInvitations = false;
		}
	}

	onMount(() => {
		loadInvitations();
	});

	function handleCreateInvitation() {
		invitationFormModalOpen = true;
	}

	function handleDeleteInvitation(invitation: Invitation) {
		selectedInvitation = invitation;
		invitationDeleteDialogOpen = true;
	}

	function handleInvitationModalClose() {
		selectedInvitation = null;
	}

	function handleInvitationSuccess() {
		loadInvitations();
	}

	function copyInviteLink(token: string) {
		const url = `${window.location.origin}/invite/${token}`;
		navigator.clipboard.writeText(url);
	}

	function getInvitationStatus(invitation: Invitation): {
		variant: 'default' | 'secondary' | 'destructive' | 'outline';
		label: string;
	} {
		if (invitation.usedAt) {
			return { variant: 'secondary', label: 'Usado' };
		}
		if (new Date(invitation.expiresAt) < new Date()) {
			return { variant: 'destructive', label: 'Expirado' };
		}
		return { variant: 'default', label: 'Pendiente' };
	}
</script>

<Card class="w-full max-w-6xl mx-auto">
	<CardHeader class="flex flex-row items-center justify-between space-y-0">
		<div class="flex items-center gap-4">
			<CardTitle class="text-2xl font-semibold tracking-tight">Invitaciones</CardTitle>
			{#if pendingInvitationsCount > 0}
				<Badge variant="secondary">{pendingInvitationsCount} {pendingInvitationsCount === 1 ? 'pendiente' : 'pendientes'}</Badge>
			{/if}
		</div>
		<div class="flex items-center gap-4">
			<div class="relative">
				<span
					class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg!"
					>search</span
				>
				<Input
					type="text"
					placeholder="Buscar por email..."
					bind:value={searchQuery}
					class="pl-9 mr-9"
				/>
			</div>
			<Button onclick={handleCreateInvitation}>
				<span class="material-symbols-rounded text-lg!">add</span>
				Invitar
			</Button>
		</div>
	</CardHeader>
	<CardContent>
		{#if loadingInvitations}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Email</TableHead>
						<TableHead>Rol</TableHead>
						<TableHead>Relación</TableHead>
						<TableHead>Estado</TableHead>
						<TableHead>Creado</TableHead>
						<TableHead>Expira</TableHead>
						<TableHead class="w-[120px]">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each Array.from({ length: 3 }, (_, i) => i) as i (i)}
						<TableRow data-placeholder-index={i}>
							<TableCell><Skeleton class="h-4 w-40" /></TableCell>
							<TableCell><Skeleton class="h-5 w-20 rounded-full" /></TableCell>
							<TableCell><Skeleton class="h-5 w-16 rounded-full" /></TableCell>
							<TableCell><Skeleton class="h-5 w-16 rounded-full" /></TableCell>
							<TableCell><Skeleton class="h-4 w-20" /></TableCell>
							<TableCell><Skeleton class="h-4 w-20" /></TableCell>
							<TableCell><Skeleton class="h-8 w-20" /></TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		{:else if invitationsError}
			<div class="flex items-center justify-center py-8 text-destructive">
				<span class="material-symbols-rounded mr-2">error</span>
				{invitationsError}
			</div>
		{:else if invitations.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
				<span class="material-symbols-rounded text-4xl! mb-2">mail</span>
				<p>No hay invitaciones</p>
				<Button variant="outline" class="mt-4" onclick={handleCreateInvitation}>
					<span class="material-symbols-rounded mr-2 text-lg!">add</span>
					Crear primera invitación
				</Button>
			</div>
		{:else if filteredInvitations.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
				<span class="material-symbols-rounded text-4xl! mb-2">search_off</span>
				<p>No se encontraron invitaciones</p>
			</div>
		{:else}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Email</TableHead>
						<TableHead>Rol</TableHead>
						<TableHead>Relación</TableHead>
						<TableHead>Estado</TableHead>
						<TableHead>Creado</TableHead>
						<TableHead>Expira</TableHead>
						<TableHead class="w-[120px]">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each filteredInvitations as invitation (invitation.id)}
						{@const status = getInvitationStatus(invitation)}
						{@const roleBadge = getRoleBadge(invitation.role)}
						{@const relationBadge = getRelationTypeBadge(invitation.relation)}
						<TableRow>
							<TableCell class="font-medium">
								<Tooltip>
									<TooltipTrigger class="max-w-[200px] truncate">
										{invitation.email}
									</TooltipTrigger>
									<TooltipContent>
										<p>{invitation.email}</p>
									</TooltipContent>
								</Tooltip>
							</TableCell>
							<TableCell>
								<Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
							</TableCell>
							<TableCell>
								<Badge variant={relationBadge.variant}>{relationBadge.label}</Badge>
							</TableCell>
							<TableCell>
								<Badge variant={status.variant}>{status.label}</Badge>
							</TableCell>
							<TableCell class="text-muted-foreground">{formatDate(invitation.createdAt)}</TableCell
							>
							<TableCell class="text-muted-foreground">{formatDate(invitation.expiresAt)}</TableCell
							>
							<TableCell>
								<div class="flex items-center gap-1">
									{#if !invitation.usedAt && new Date(invitation.expiresAt) >= new Date()}
										<Tooltip>
											<TooltipTrigger>
												<Button
													variant="ghost"
													size="sm"
													class="h-8 w-8 p-0"
													onclick={() => copyInviteLink(invitation.token)}
												>
													<span class="material-symbols-rounded text-xl!">content_copy</span>
													<span class="sr-only">Copiar enlace</span>
												</Button>
											</TooltipTrigger>
											<TooltipContent>
												<p>Copiar enlace de invitación</p>
											</TooltipContent>
										</Tooltip>
									{/if}
									<Button
										variant="ghost"
										size="sm"
										class="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
										onclick={() => handleDeleteInvitation(invitation)}
									>
										<span class="material-symbols-rounded text-xl!">delete</span>
										<span class="sr-only">Eliminar</span>
									</Button>
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		{/if}
	</CardContent>
</Card>

<InvitationFormModal
	bind:open={invitationFormModalOpen}
	onClose={handleInvitationModalClose}
	onSuccess={handleInvitationSuccess}
/>

<InvitationDeleteDialog
	bind:open={invitationDeleteDialogOpen}
	invitation={selectedInvitation}
	onClose={handleInvitationModalClose}
	onSuccess={handleInvitationSuccess}
/>

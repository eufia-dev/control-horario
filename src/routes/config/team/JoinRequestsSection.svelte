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
	import JoinRequestDialog from './JoinRequestDialog.svelte';
	import { fetchJoinRequests, type AdminJoinRequest } from '$lib/api/invitations';
	import { formatDate } from '../helpers';

	type Props = {
		onRequestsChange?: (requests: AdminJoinRequest[]) => void;
	};

	let { onRequestsChange }: Props = $props();

	let joinRequests = $state<AdminJoinRequest[]>([]);
	let loadingJoinRequests = $state(true);
	let joinRequestsError = $state<string | null>(null);
	let searchQuery = $state('');

	const filteredJoinRequests = $derived(
		joinRequests.filter((request) => {
			if (!searchQuery.trim()) return true;
			const query = searchQuery.toLowerCase();
			return (
				request.name.toLowerCase().includes(query) || request.email.toLowerCase().includes(query)
			);
		})
	);

	let joinRequestDialogOpen = $state(false);
	let selectedJoinRequest = $state<AdminJoinRequest | null>(null);
	let joinRequestAction = $state<'approve' | 'reject'>('approve');

	const pendingJoinRequestsCount = $derived(
		joinRequests.filter((r) => r.status === 'PENDING').length
	);

	async function loadJoinRequests() {
		loadingJoinRequests = true;
		joinRequestsError = null;
		try {
			joinRequests = await fetchJoinRequests();
			onRequestsChange?.(joinRequests);
		} catch (e) {
			joinRequestsError = e instanceof Error ? e.message : 'Error desconocido';
		} finally {
			loadingJoinRequests = false;
		}
	}

	onMount(() => {
		loadJoinRequests();
	});

	function handleApproveJoinRequest(request: AdminJoinRequest) {
		selectedJoinRequest = request;
		joinRequestAction = 'approve';
		joinRequestDialogOpen = true;
	}

	function handleRejectJoinRequest(request: AdminJoinRequest) {
		selectedJoinRequest = request;
		joinRequestAction = 'reject';
		joinRequestDialogOpen = true;
	}

	function handleJoinRequestDialogClose() {
		selectedJoinRequest = null;
	}

	function handleJoinRequestSuccess() {
		loadJoinRequests();
	}
</script>

<Card class="w-full max-w-6xl mx-auto">
	<CardHeader class="flex flex-wrap items-center gap-4 space-y-0">
		<div class="flex items-center gap-4">
			<CardTitle class="text-2xl font-semibold tracking-tight">Solicitudes de Acceso</CardTitle>
			{#if pendingJoinRequestsCount > 0}
				<Badge variant="default">
					{pendingJoinRequestsCount}
					{pendingJoinRequestsCount === 1 ? ' pendiente' : ' pendientes'}
				</Badge>
			{/if}
		</div>
		<div class="hidden md:block flex-1"></div>
		<div class="relative w-full md:w-auto">
			<span
				class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg!"
				>search</span
			>
			<Input
				type="text"
				placeholder="Buscar por nombre o email..."
				bind:value={searchQuery}
				class="pl-9"
			/>
		</div>
	</CardHeader>
	<CardContent>
		{#if loadingJoinRequests}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Nombre</TableHead>
						<TableHead>Email</TableHead>
						<TableHead>Estado</TableHead>
						<TableHead>Solicitado</TableHead>
						<TableHead class="w-[120px]">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each Array.from({ length: 3 }, (_, i) => i) as i (i)}
						<TableRow data-placeholder-index={i}>
							<TableCell><Skeleton class="h-4 w-28" /></TableCell>
							<TableCell><Skeleton class="h-4 w-40" /></TableCell>
							<TableCell><Skeleton class="h-5 w-16 rounded-full" /></TableCell>
							<TableCell><Skeleton class="h-4 w-20" /></TableCell>
							<TableCell><Skeleton class="h-8 w-20" /></TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		{:else if joinRequestsError}
			<div class="flex items-center justify-center py-8 text-destructive">
				<span class="material-symbols-rounded mr-2">error</span>
				{joinRequestsError}
			</div>
		{:else if joinRequests.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
				<span class="material-symbols-rounded text-4xl! mb-2">person_search</span>
				<p>No hay solicitudes de acceso</p>
			</div>
		{:else if filteredJoinRequests.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
				<span class="material-symbols-rounded text-4xl! mb-2">search_off</span>
				<p>No se encontraron solicitudes</p>
			</div>
		{:else}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Nombre</TableHead>
						<TableHead>Email</TableHead>
						<TableHead>Estado</TableHead>
						<TableHead>Solicitado</TableHead>
						<TableHead class="w-[120px]">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each filteredJoinRequests as request (request.id)}
						{@const isPending = request.status === 'PENDING'}
						<TableRow>
							<TableCell class="font-medium">
								<Tooltip>
									<TooltipTrigger class="max-w-[150px] truncate">
										{request.name}
									</TooltipTrigger>
									<TooltipContent>
										<p>{request.name}</p>
									</TooltipContent>
								</Tooltip>
							</TableCell>
							<TableCell>
								<Tooltip>
									<TooltipTrigger class="max-w-[200px] truncate">
										{request.email}
									</TooltipTrigger>
									<TooltipContent>
										<p>{request.email}</p>
									</TooltipContent>
								</Tooltip>
							</TableCell>
							<TableCell>
								{#if request.status === 'PENDING'}
									<Badge variant="secondary">Pendiente</Badge>
								{:else if request.status === 'APPROVED'}
									<Badge variant="success">Aprobado</Badge>
								{:else}
									<Badge variant="destructive">Rechazado</Badge>
								{/if}
							</TableCell>
							<TableCell class="text-muted-foreground">{formatDate(request.createdAt)}</TableCell>
							<TableCell>
								{#if isPending}
									<div class="flex items-center gap-1">
										<Tooltip>
											<TooltipTrigger>
												<Button
													variant="ghost"
													size="sm"
													class="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10"
													onclick={() => handleApproveJoinRequest(request)}
												>
													<span class="material-symbols-rounded text-xl!">check</span>
													<span class="sr-only">Aprobar</span>
												</Button>
											</TooltipTrigger>
											<TooltipContent>
												<p>Aprobar solicitud</p>
											</TooltipContent>
										</Tooltip>
										<Tooltip>
											<TooltipTrigger>
												<Button
													variant="ghost"
													size="sm"
													class="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
													onclick={() => handleRejectJoinRequest(request)}
												>
													<span class="material-symbols-rounded text-xl!">close</span>
													<span class="sr-only">Rechazar</span>
												</Button>
											</TooltipTrigger>
											<TooltipContent>
												<p>Rechazar solicitud</p>
											</TooltipContent>
										</Tooltip>
									</div>
								{:else}
									<span class="text-sm text-muted-foreground">-</span>
								{/if}
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		{/if}
	</CardContent>
</Card>

<JoinRequestDialog
	bind:open={joinRequestDialogOpen}
	request={selectedJoinRequest}
	action={joinRequestAction}
	onClose={handleJoinRequestDialogClose}
	onSuccess={handleJoinRequestSuccess}
/>

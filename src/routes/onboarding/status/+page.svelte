<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import { logout, checkAndSetOnboardingStatus } from '$lib/auth';
	import { getMyRequests, cancelJoinRequest, type JoinRequest } from '$lib/api/onboarding';
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
	import { Skeleton } from '$lib/components/ui/skeleton';

	let requests = $state<JoinRequest[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let cancellingId = $state<string | null>(null);

	// Load requests on mount
	onMount(async () => {
		await loadRequests();
	});

	const loadRequests = async () => {
		isLoading = true;
		error = null;

		try {
			requests = await getMyRequests();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar las solicitudes';
		} finally {
			isLoading = false;
		}
	};

	const handleCancelRequest = async (requestId: string) => {
		if (cancellingId) return;

		cancellingId = requestId;

		try {
			await cancelJoinRequest(requestId);
			// Reload requests
			await loadRequests();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cancelar la solicitud';
		} finally {
			cancellingId = null;
		}
	};

	const handleRefresh = async () => {
		// Check onboarding status - if approved, will redirect to dashboard
		try {
			const status = await checkAndSetOnboardingStatus();
			if (status === 'ACTIVE') {
				await goto('/');
			} else {
				await loadRequests();
			}
		} catch {
			await loadRequests();
		}
	};

	const handleLogout = async () => {
		await logout();
		await goto('/login');
	};

	const handleNewRequest = () => {
		goto('/onboarding/join');
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'PENDING':
				return { variant: 'secondary' as const, label: 'Pendiente', icon: 'schedule' };
			case 'APPROVED':
				return { variant: 'success' as const, label: 'Aprobada', icon: 'check_circle' };
			case 'REJECTED':
				return { variant: 'destructive' as const, label: 'Rechazada', icon: 'cancel' };
			default:
				return { variant: 'outline' as const, label: status, icon: 'help' };
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('es-ES', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	};

	const pendingRequests = $derived(requests.filter((r) => r.status === 'PENDING'));
	const resolvedRequests = $derived(requests.filter((r) => r.status !== 'PENDING'));
</script>

<div class="grow flex items-center justify-center bg-background px-4 py-8">
	<div class="w-full max-w-2xl">
		<Card>
			<CardHeader>
				<div class="flex items-center justify-between">
					<div>
						<CardTitle class="text-xl flex items-center gap-2">
							<span class="material-symbols-rounded text-primary">pending_actions</span>
							Estado de tus solicitudes
						</CardTitle>
						<CardDescription class="mt-1">
							Revisa el estado de tus solicitudes para unirte a empresas
						</CardDescription>
					</div>
					<Button variant="outline" size="sm" onclick={handleRefresh}>
						<span class="material-symbols-rounded text-lg!">refresh</span>
					</Button>
				</div>
			</CardHeader>
			<CardContent class="space-y-6">
				{#if isLoading}
					<div class="space-y-3">
						{#each Array(2) as _}
							<div class="p-4 rounded-lg border border-border">
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-3">
										<Skeleton class="w-10 h-10 rounded-full" />
										<div class="space-y-2">
											<Skeleton class="h-4 w-32" />
											<Skeleton class="h-3 w-24" />
										</div>
									</div>
									<Skeleton class="h-6 w-20 rounded-full" />
								</div>
							</div>
						{/each}
					</div>
				{:else if error}
					<div class="flex items-center justify-center py-8 text-destructive">
						<span class="material-symbols-rounded mr-2">error</span>
						{error}
					</div>
				{:else if requests.length === 0}
					<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
						<span class="material-symbols-rounded text-4xl! mb-2">inbox</span>
						<p class="mb-4">No tienes solicitudes pendientes</p>
						<Button onclick={handleNewRequest}>
							<span class="material-symbols-rounded text-lg! mr-2">add</span>
							Nueva solicitud
						</Button>
					</div>
				{:else}
					<!-- Pending Requests -->
					{#if pendingRequests.length > 0}
						<div class="space-y-3">
							<h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2">
								<span class="material-symbols-rounded text-lg!">schedule</span>
								Pendientes ({pendingRequests.length})
							</h3>
							{#each pendingRequests as request (request.id)}
								{@const statusBadge = getStatusBadge(request.status)}
								<div class="p-4 rounded-lg border border-border bg-card">
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-3">
											<div
												class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0"
											>
												<span class="material-symbols-rounded">business</span>
											</div>
											<div>
												<p class="font-medium">{request.companyName}</p>
												<p class="text-sm text-muted-foreground">
													Solicitado: {formatDate(request.createdAt)}
												</p>
											</div>
										</div>
										<div class="flex items-center gap-2">
											<Badge variant={statusBadge.variant}>
												<span class="material-symbols-rounded text-sm! mr-1"
													>{statusBadge.icon}</span
												>
												{statusBadge.label}
											</Badge>
											<Button
												variant="ghost"
												size="sm"
												class="text-destructive hover:text-destructive hover:bg-destructive/10"
												onclick={() => handleCancelRequest(request.id)}
												disabled={cancellingId === request.id}
											>
												{#if cancellingId === request.id}
													<span class="material-symbols-rounded animate-spin text-lg!"
														>progress_activity</span
													>
												{:else}
													<span class="material-symbols-rounded text-lg!">close</span>
												{/if}
											</Button>
										</div>
									</div>
								</div>
							{/each}
						</div>

						<div
							class="flex items-center gap-3 p-4 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-500/20"
						>
							<span class="material-symbols-rounded text-xl!">info</span>
							<p class="text-sm">
								Un administrador debe aprobar tu solicitud. Esto puede tardar un poco.
							</p>
						</div>
					{/if}

					<!-- Resolved Requests -->
					{#if resolvedRequests.length > 0}
						<div class="space-y-3">
							<h3 class="text-sm font-medium text-muted-foreground flex items-center gap-2">
								<span class="material-symbols-rounded text-lg!">history</span>
								Historial ({resolvedRequests.length})
							</h3>
							{#each resolvedRequests as request (request.id)}
								{@const statusBadge = getStatusBadge(request.status)}
								<div class="p-4 rounded-lg border border-border bg-muted/30">
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-3">
											<div
												class="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground shrink-0"
											>
												<span class="material-symbols-rounded">business</span>
											</div>
											<div>
												<p class="font-medium">{request.companyName}</p>
												<p class="text-sm text-muted-foreground">
													{request.reviewedAt
														? `Revisado: ${formatDate(request.reviewedAt)}`
														: formatDate(request.createdAt)}
												</p>
											</div>
										</div>
										<Badge variant={statusBadge.variant}>
											<span class="material-symbols-rounded text-sm! mr-1">{statusBadge.icon}</span>
											{statusBadge.label}
										</Badge>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				{/if}

				<CardFooter class="flex justify-between px-0 pt-4">
					<Button variant="ghost" onclick={handleLogout}>
						<span class="material-symbols-rounded text-lg! mr-2">logout</span>
						Cerrar sesión
					</Button>
					{#if requests.length > 0}
						<Button variant="outline" onclick={handleNewRequest}>
							<span class="material-symbols-rounded text-lg! mr-2">add</span>
							Nueva solicitud
						</Button>
					{/if}
				</CardFooter>
			</CardContent>
		</Card>
	</div>
</div>

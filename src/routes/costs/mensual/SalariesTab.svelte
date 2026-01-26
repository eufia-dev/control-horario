<script lang="ts">
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import {
		fetchMonthlySalaries,
		type UserMonthlySalary,
		type MonthlySalariesResponse,
		type MonthClosingStatus
	} from '$lib/api/month-closing';
	import { formatCurrency } from '$lib/api/costs';
	import SalaryEditDialog from './SalaryEditDialog.svelte';

	type Props = {
		year: number;
		month: number;
		monthStatus: MonthClosingStatus;
		onStatusChange?: (newStatus: MonthClosingStatus) => void;
	};

	let { year, month, monthStatus, onStatusChange }: Props = $props();

	let loading = $state(true);
	let error = $state<string | null>(null);
	let data = $state<MonthlySalariesResponse | null>(null);

	let dialogOpen = $state(false);
	let selectedUser = $state<UserMonthlySalary | null>(null);

	// Track year/month changes
	let currentYear = $state(year);
	let currentMonth = $state(month);

	$effect(() => {
		if (year !== currentYear || month !== currentMonth) {
			currentYear = year;
			currentMonth = month;
			loadData();
		}
	});

	async function loadData() {
		loading = true;
		error = null;
		try {
			data = await fetchMonthlySalaries(year, month);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar salarios';
		} finally {
			loading = false;
		}
	}

	function handleEdit(user: UserMonthlySalary) {
		selectedUser = user;
		dialogOpen = true;
	}

	function handleDialogClose() {
		selectedUser = null;
	}

	async function handleSaveSuccess(warning?: string) {
		if (warning) {
			// Notify parent about potential status change
			onStatusChange?.('REOPENED');
		}
		await loadData();
	}

	// Load data on mount
	$effect(() => {
		loadData();
	});

	const usersWithMissingSalary = $derived(
		data?.users.filter((u) => u.baseSalary === null) ?? []
	);
</script>

<Card>
	<CardHeader>
		<div class="flex items-center justify-between">
			<div>
				<CardTitle class="text-lg">Salarios del Mes</CardTitle>
				<p class="text-sm text-muted-foreground mt-1">
					Gestiona los salarios base y extras de los empleados
				</p>
			</div>
			{#if data && !loading}
				<div class="text-right">
					<div class="text-sm text-muted-foreground">Total Salarios</div>
					<div class="text-xl font-bold text-primary">
						{formatCurrency(data.totals.total)}
					</div>
				</div>
			{/if}
		</div>
	</CardHeader>
	<CardContent>
		{#if loading}
			<div class="space-y-3">
				{#each Array.from({ length: 5 }) as _, i (i)}
					<div class="flex items-center gap-4">
						<Skeleton class="h-10 w-40" />
						<Skeleton class="h-10 w-32" />
						<Skeleton class="h-10 w-24" />
						<Skeleton class="h-10 w-24" />
						<Skeleton class="h-10 w-20" />
					</div>
				{/each}
			</div>
		{:else if error}
			<div class="flex flex-col items-center justify-center py-8 text-destructive">
				<span class="material-symbols-rounded text-3xl! mb-2">error</span>
				<p>{error}</p>
				<Button variant="outline" size="sm" class="mt-4" onclick={loadData}>
					<span class="material-symbols-rounded mr-1 text-lg!">refresh</span>
					Reintentar
				</Button>
			</div>
		{:else if !data || data.users.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
				<span class="material-symbols-rounded text-4xl! mb-2">group_off</span>
				<p>No hay empleados activos</p>
			</div>
		{:else}
			{#if usersWithMissingSalary.length > 0}
				<div
					class="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg"
				>
					<div class="flex items-start gap-2">
						<span class="material-symbols-rounded text-amber-600 text-lg!">warning</span>
						<div>
							<p class="text-sm font-medium text-amber-800 dark:text-amber-200">
								{usersWithMissingSalary.length} empleado{usersWithMissingSalary.length > 1
									? 's'
									: ''} sin salario base
							</p>
							<p class="text-xs text-amber-600 dark:text-amber-400 mt-1">
								Configura el salario base antes de cerrar el mes
							</p>
						</div>
					</div>
				</div>
			{/if}

			<ScrollArea class="max-h-[500px]">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Empleado</TableHead>
							<TableHead class="text-right">Salario Base</TableHead>
							<TableHead class="text-right">Extras</TableHead>
							<TableHead class="text-right">Total</TableHead>
							<TableHead>Notas</TableHead>
							<TableHead class="w-[80px]">Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each data.users as user (user.userId)}
							{@const hasMissingSalary = user.baseSalary === null}
							<TableRow class={hasMissingSalary ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
								<TableCell>
									<div class="flex flex-col">
										<span class="font-medium">{user.userName}</span>
										<span class="text-xs text-muted-foreground">{user.userEmail}</span>
									</div>
								</TableCell>
								<TableCell class="text-right">
									{#if hasMissingSalary}
										<Badge variant="outline" class="text-amber-600 border-amber-300">
											Sin configurar
										</Badge>
									{:else}
										<span class="font-medium">{formatCurrency(user.baseSalary)}</span>
									{/if}
								</TableCell>
								<TableCell class="text-right">
									{#if user.extras > 0}
										<div class="flex flex-col items-end">
											<span class="font-medium text-green-600">
												+{formatCurrency(user.extras)}
											</span>
											{#if user.extrasDescription}
												<span class="text-xs text-muted-foreground truncate max-w-[120px]">
													{user.extrasDescription}
												</span>
											{/if}
										</div>
									{:else}
										<span class="text-muted-foreground">—</span>
									{/if}
								</TableCell>
								<TableCell class="text-right">
									{#if user.totalSalary !== null}
										<span class="font-semibold">{formatCurrency(user.totalSalary)}</span>
									{:else}
										<span class="text-muted-foreground">—</span>
									{/if}
								</TableCell>
								<TableCell class="max-w-[150px]">
									{#if user.notes}
										<span class="text-sm text-muted-foreground truncate block">
											{user.notes}
										</span>
									{:else}
										<span class="text-muted-foreground">—</span>
									{/if}
								</TableCell>
								<TableCell>
									<Button
										variant="ghost"
										size="sm"
										class="h-8 w-8 p-0"
										onclick={() => handleEdit(user)}
									>
										<span class="material-symbols-rounded text-lg!">edit</span>
										<span class="sr-only">Editar</span>
									</Button>
								</TableCell>
							</TableRow>
						{/each}
						<!-- Totals Row -->
						<TableRow class="bg-muted/50 font-semibold">
							<TableCell>Total</TableCell>
							<TableCell class="text-right">{formatCurrency(data.totals.baseSalaries)}</TableCell>
							<TableCell class="text-right text-green-600">
								+{formatCurrency(data.totals.extras)}
							</TableCell>
							<TableCell class="text-right text-primary">
								{formatCurrency(data.totals.total)}
							</TableCell>
							<TableCell></TableCell>
							<TableCell></TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</ScrollArea>
		{/if}
	</CardContent>
</Card>

<SalaryEditDialog
	bind:open={dialogOpen}
	user={selectedUser}
	{year}
	{month}
	{monthStatus}
	onSave={handleSaveSuccess}
	onClose={handleDialogClose}
/>

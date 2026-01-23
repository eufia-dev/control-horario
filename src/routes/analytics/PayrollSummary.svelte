<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import { RangeCalendar } from '$lib/components/ui/range-calendar';
	import {
		Table,
		TableBody,
		TableCell,
		TableFooter,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import {
		fetchPayrollSummary,
		formatCost,
		formatHours,
		type PayrollSummaryResponse,
		type PayrollUserSummary
	} from '$lib/api/analytics';
	import { CalendarDate, type DateValue } from '@internationalized/date';

	type DateRange = {
		start: DateValue | undefined;
		end: DateValue | undefined;
	};

	// Helper to get first and last day of current month as default
	function getDefaultDateRange(): DateRange {
		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth();
		const firstDay = new CalendarDate(year, month + 1, 1);
		const lastDay = new CalendarDate(year, month + 1, new Date(year, month + 1, 0).getDate());
		return {
			start: firstDay,
			end: lastDay
		};
	}

	// State
	let dateRange = $state<DateRange>(getDefaultDateRange());
	let payrollData = $state<PayrollSummaryResponse | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let dateRangePopoverOpen = $state(false);
	let searchQuery = $state('');

	// Derived - convert DateValue to ISO string for API
	const startDateStr = $derived(
		dateRange.start
			? `${dateRange.start.year}-${String(dateRange.start.month).padStart(2, '0')}-${String(dateRange.start.day).padStart(2, '0')}`
			: null
	);
	const endDateStr = $derived(
		dateRange.end
			? `${dateRange.end.year}-${String(dateRange.end.month).padStart(2, '0')}-${String(dateRange.end.day).padStart(2, '0')}`
			: null
	);

	// Filtered users based on search query
	const filteredUsers = $derived(
		payrollData?.users.filter((user) => {
			if (!searchQuery.trim()) return true;
			const query = searchQuery.toLowerCase();
			return user.name.toLowerCase().includes(query);
		}) ?? []
	);

	// Format date for display
	function formatDateValue(date: DateValue): string {
		return new Date(date.year, date.month - 1, date.day).toLocaleDateString('es-ES', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	// Format date range display
	function formatDateRangeDisplay(range: DateRange): string {
		if (!range.start) return 'Seleccionar período';
		if (!range.end) return formatDateValue(range.start);
		if (range.start.compare(range.end) === 0) {
			return formatDateValue(range.start);
		}
		return `${formatDateValue(range.start)} - ${formatDateValue(range.end)}`;
	}

	// Format difference with color indicator
	function formatDifference(minutes: number): { text: string; class: string } {
		const hours = minutes / 60;
		const sign = minutes > 0 ? '+' : '';
		return {
			text: `${sign}${hours.toFixed(1)}h`,
			class: minutes > 0 ? 'text-green-600' : minutes < 0 ? 'text-red-600' : 'text-muted-foreground'
		};
	}

	// Calculate total absence days for a user
	function getTotalAbsenceDays(user: PayrollUserSummary): number {
		return user.vacationDays + user.sickLeaveDays + user.otherAbsenceDays;
	}

	// Quick date range presets
	function setCurrentMonth() {
		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth();
		dateRange = {
			start: new CalendarDate(year, month + 1, 1),
			end: new CalendarDate(year, month + 1, new Date(year, month + 1, 0).getDate())
		};
		dateRangePopoverOpen = false;
	}

	function setLastMonth() {
		const now = new Date();
		const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
		const month = now.getMonth() === 0 ? 12 : now.getMonth();
		dateRange = {
			start: new CalendarDate(year, month, 1),
			end: new CalendarDate(year, month, new Date(year, month, 0).getDate())
		};
		dateRangePopoverOpen = false;
	}

	function setLastWeek() {
		const now = new Date();
		const endDate = new Date(now);
		const startDate = new Date(now);
		startDate.setDate(startDate.getDate() - 7);
		dateRange = {
			start: new CalendarDate(
				startDate.getFullYear(),
				startDate.getMonth() + 1,
				startDate.getDate()
			),
			end: new CalendarDate(endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate())
		};
		dateRangePopoverOpen = false;
	}

	function setCurrentYear() {
		const now = new Date();
		const year = now.getFullYear();
		dateRange = {
			start: new CalendarDate(year, 1, 1),
			end: new CalendarDate(year, now.getMonth() + 1, now.getDate())
		};
		dateRangePopoverOpen = false;
	}

	// Data loading
	async function loadData() {
		if (!startDateStr || !endDateStr) return;

		loading = true;
		error = null;
		try {
			payrollData = await fetchPayrollSummary(startDateStr, endDateStr);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar los datos de nóminas';
			payrollData = null;
		} finally {
			loading = false;
		}
	}

	// Reload when date range changes (only when both start and end are set)
	$effect(() => {
		if (startDateStr && endDateStr) {
			loadData();
		}
	});
</script>

<Card>
	<CardHeader class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0">
		<div>
			<CardTitle class="text-xl font-semibold flex items-center gap-2">
				<span class="material-symbols-rounded text-2xl!">payments</span>
				Resumen de Nóminas
			</CardTitle>
			<p class="text-sm text-muted-foreground mt-1">Horas trabajadas y costes por empleado</p>
		</div>
		<div class="flex items-center gap-2">
			<div class="relative">
				<span
					class="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg!"
					>search</span
				>
				<Input
					type="text"
					placeholder="Buscar empleado..."
					bind:value={searchQuery}
					class="pl-9 w-[180px]"
				/>
			</div>
			<Popover bind:open={dateRangePopoverOpen}>
				<PopoverTrigger>
					<Button
						variant="outline"
						class="justify-start text-left font-normal min-w-[260px]"
						disabled={loading}
					>
						<span class="material-symbols-rounded text-lg! mr-2">calendar_today</span>
						{formatDateRangeDisplay(dateRange)}
					</Button>
				</PopoverTrigger>
				<PopoverContent class="w-auto p-0" align="end">
					<div class="flex">
						<div class="flex flex-col gap-1 border-r p-3 min-w-[140px]">
							<span class="text-xs font-medium text-muted-foreground mb-1">Accesos rápidos</span>
							<Button
								variant="ghost"
								size="sm"
								class="justify-start text-sm h-8"
								onclick={setLastWeek}
							>
								Últimos 7 días
							</Button>
							<Button
								variant="ghost"
								size="sm"
								class="justify-start text-sm h-8"
								onclick={setCurrentMonth}
							>
								Este mes
							</Button>
							<Button
								variant="ghost"
								size="sm"
								class="justify-start text-sm h-8"
								onclick={setLastMonth}
							>
								Mes anterior
							</Button>
							<Button
								variant="ghost"
								size="sm"
								class="justify-start text-sm h-8"
								onclick={setCurrentYear}
							>
								Este año
							</Button>
						</div>
						<RangeCalendar
							bind:value={dateRange}
							numberOfMonths={2}
							disableDaysOutsideMonth={true}
							onValueChange={() => {
								if (dateRange?.start && dateRange?.end) {
									dateRangePopoverOpen = false;
								}
							}}
						/>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	</CardHeader>
	<CardContent>
		{#if loading}
			<div class="space-y-3">
				<Skeleton class="h-10 w-full" />
				{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
					<Skeleton class="h-12 w-full" />
				{/each}
				<Skeleton class="h-12 w-full" />
			</div>
		{:else if error}
			<div class="flex flex-col items-center justify-center py-12 text-destructive">
				<span class="material-symbols-rounded text-4xl! mb-2">error</span>
				<p>{error}</p>
				<Button variant="outline" class="mt-4" onclick={loadData}>
					<span class="material-symbols-rounded text-lg! mr-2">refresh</span>
					Reintentar
				</Button>
			</div>
		{:else if !payrollData || payrollData.users.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
				<span class="material-symbols-rounded text-4xl! mb-2">group_off</span>
				<p>No hay datos de empleados para este período</p>
			</div>
		{:else if filteredUsers.length === 0}
			<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
				<span class="material-symbols-rounded text-4xl! mb-2">search_off</span>
				<p>No se encontraron empleados con ese nombre</p>
			</div>
		{:else}
			<div class="overflow-x-auto -mx-6 px-6">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead class="min-w-[250px]">Empleado</TableHead>
							<TableHead class="text-right min-w-[100px]">H. Esperadas</TableHead>
							<TableHead class="text-right min-w-[100px]">H. Trabajadas</TableHead>
							<TableHead class="text-right min-w-[70px]">H. Café</TableHead>
							<TableHead class="text-right min-w-[90px]">Diferencia</TableHead>
							<TableHead class="text-right min-w-[80px]">Ausencias</TableHead>
							<TableHead class="text-right min-w-[100px]">Coste</TableHead>
							<TableHead class="w-[80px]">Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each filteredUsers as user (user.id)}
							{@const diff = formatDifference(user.differenceMinutes)}
							{@const totalAbsences = getTotalAbsenceDays(user)}
							<TableRow>
								<TableCell class="font-medium">
									<div class="flex flex-col gap-0.5">
										<div class="flex items-center gap-2">
											<span>{user.name}</span>
											{#if user.team}
												<Badge variant="outline" class="text-xs font-normal">
													{user.team.name}
												</Badge>
											{/if}
										</div>
										<span class="text-xs text-muted-foreground">
											{formatCost(user.hourlyCost)}/h
										</span>
									</div>
								</TableCell>
								<TableCell class="text-right tabular-nums">
									{formatHours(user.expectedMinutes)}
								</TableCell>
								<TableCell class="text-right tabular-nums font-medium">
									{formatHours(user.loggedMinutes)}
								</TableCell>
								<TableCell class="text-right tabular-nums text-muted-foreground">
									{#if user.coffeePauseMinutes > 0}
										{formatHours(user.coffeePauseMinutes)}
									{:else}
										<span class="text-muted-foreground/50">-</span>
									{/if}
								</TableCell>
								<TableCell class="text-right tabular-nums font-semibold {diff.class}">
									{diff.text}
								</TableCell>
								<TableCell class="text-right">
									{#if totalAbsences > 0}
										<Tooltip>
											<TooltipTrigger>
												<span
													class="tabular-nums font-medium cursor-help underline decoration-dotted underline-offset-4"
												>
													{totalAbsences}d
												</span>
											</TooltipTrigger>
											<TooltipContent>
												<div class="space-y-1 text-xs">
													{#if user.vacationDays > 0}
														<div class="flex justify-between gap-4">
															<span>Vacaciones:</span>
															<span class="font-medium">{user.vacationDays}d</span>
														</div>
													{/if}
													{#if user.sickLeaveDays > 0}
														<div class="flex justify-between gap-4">
															<span>Bajas:</span>
															<span class="font-medium">{user.sickLeaveDays}d</span>
														</div>
													{/if}
													{#if user.otherAbsenceDays > 0}
														<div class="flex justify-between gap-4">
															<span>Otras:</span>
															<span class="font-medium">{user.otherAbsenceDays}d</span>
														</div>
													{/if}
												</div>
											</TooltipContent>
										</Tooltip>
									{:else}
										<span class="text-muted-foreground">-</span>
									{/if}
								</TableCell>
								<TableCell class="text-right tabular-nums font-semibold">
									{formatCost(user.totalCost)}
								</TableCell>
								<TableCell>
									<Tooltip>
										<TooltipTrigger>
											<Button
												variant="ghost"
												size="sm"
												class="h-8 w-8 p-0"
												onclick={() => goto(resolve(`/admin/users/${user.id}`))}
											>
												<span class="material-symbols-rounded text-xl!">schedule</span>
												<span class="sr-only">Ver registros</span>
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>Ver registros</p>
										</TooltipContent>
									</Tooltip>
								</TableCell>
							</TableRow>
						{/each}
					</TableBody>
					<TableFooter>
						<TableRow class="bg-muted/50 font-semibold">
							{@const filteredExpectedMinutes = filteredUsers.reduce(
								(sum, u) => sum + u.expectedMinutes,
								0
							)}
							{@const filteredLoggedMinutes = filteredUsers.reduce(
								(sum, u) => sum + u.loggedMinutes,
								0
							)}
							{@const filteredCoffeePauseMinutes = filteredUsers.reduce(
								(sum, u) => sum + u.coffeePauseMinutes,
								0
							)}
							{@const filteredDifferenceMinutes = filteredUsers.reduce(
								(sum, u) => sum + u.differenceMinutes,
								0
							)}
							{@const filteredVacationDays = filteredUsers.reduce(
								(sum, u) => sum + u.vacationDays,
								0
							)}
							{@const filteredSickLeaveDays = filteredUsers.reduce(
								(sum, u) => sum + u.sickLeaveDays,
								0
							)}
							{@const filteredOtherAbsenceDays = filteredUsers.reduce(
								(sum, u) => sum + u.otherAbsenceDays,
								0
							)}
							{@const filteredTotalCost = filteredUsers.reduce((sum, u) => sum + u.totalCost, 0)}
							{@const totalDiff = formatDifference(filteredDifferenceMinutes)}
							{@const totalAbsences =
								filteredVacationDays + filteredSickLeaveDays + filteredOtherAbsenceDays}
							<TableCell>
								<span class="flex items-center gap-1.5">
									<span class="material-symbols-rounded text-lg!">functions</span>
									Total ({filteredUsers.length} empleados{searchQuery.trim()
										? ` de ${payrollData.users.length}`
										: ''})
								</span>
							</TableCell>
							<TableCell class="text-right tabular-nums">
								{formatHours(filteredExpectedMinutes)}
							</TableCell>
							<TableCell class="text-right tabular-nums">
								{formatHours(filteredLoggedMinutes)}
							</TableCell>
							<TableCell class="text-right tabular-nums text-muted-foreground">
								{#if filteredCoffeePauseMinutes > 0}
									{formatHours(filteredCoffeePauseMinutes)}
								{:else}
									<span class="text-muted-foreground/50">-</span>
								{/if}
							</TableCell>
							<TableCell class="text-right tabular-nums {totalDiff.class}">
								{totalDiff.text}
							</TableCell>
							<TableCell class="text-right">
								{#if totalAbsences > 0}
									<Tooltip>
										<TooltipTrigger>
											<span
												class="tabular-nums cursor-help underline decoration-dotted underline-offset-4"
											>
												{totalAbsences}d
											</span>
										</TooltipTrigger>
										<TooltipContent>
											<div class="space-y-1 text-xs">
												{#if filteredVacationDays > 0}
													<div class="flex justify-between gap-4">
														<span>Vacaciones:</span>
														<span class="font-medium">{filteredVacationDays}d</span>
													</div>
												{/if}
												{#if filteredSickLeaveDays > 0}
													<div class="flex justify-between gap-4">
														<span>Bajas:</span>
														<span class="font-medium">{filteredSickLeaveDays}d</span>
													</div>
												{/if}
												{#if filteredOtherAbsenceDays > 0}
													<div class="flex justify-between gap-4">
														<span>Otras:</span>
														<span class="font-medium">{filteredOtherAbsenceDays}d</span>
													</div>
												{/if}
											</div>
										</TooltipContent>
									</Tooltip>
								{:else}
									<span class="text-muted-foreground">-</span>
								{/if}
							</TableCell>
							<TableCell class="text-right tabular-nums">
								{formatCost(filteredTotalCost)}
							</TableCell>
							<TableCell></TableCell>
						</TableRow>
					</TableFooter>
				</Table>
			</div>
		{/if}
	</CardContent>
</Card>

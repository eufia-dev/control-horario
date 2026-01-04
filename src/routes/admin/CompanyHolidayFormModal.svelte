<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { Calendar as CalendarPicker } from '$lib/components/ui/calendar';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import { createCompanyHoliday } from '$lib/api/holidays';
	import { CalendarDate } from '@internationalized/date';

	type Props = {
		open: boolean;
		onClose: () => void;
		onSuccess: () => void;
	};

	let { open = $bindable(), onClose, onSuccess }: Props = $props();

	let name = $state('');
	let selectedDate = $state<CalendarDate | undefined>(undefined);
	let isRecurring = $state(false);
	let submitting = $state(false);
	let success = $state(false);
	let error = $state<string | null>(null);
	let datePopoverOpen = $state(false);

	function resetForm() {
		name = '';
		selectedDate = undefined;
		isRecurring = false;
		error = null;
		success = false;
	}

	$effect(() => {
		if (open) {
			resetForm();
		}
	});

	function formatDate(date: CalendarDate): string {
		return new Date(date.year, date.month - 1, date.day).toLocaleDateString('es-ES', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function toISODate(date: CalendarDate): string {
		return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (submitting || success) return;
		error = null;

		if (!name.trim()) {
			error = 'El nombre del festivo es obligatorio';
			return;
		}

		if (!selectedDate) {
			error = 'Selecciona una fecha';
			return;
		}

		submitting = true;

		try {
			await createCompanyHoliday({
				name: name.trim(),
				date: toISODate(selectedDate),
				isRecurring
			});
			submitting = false;
			success = true;
			onSuccess();
			// Small delay to show success animation before closing
			setTimeout(() => {
				open = false;
				onClose();
			}, 800);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al crear el festivo';
			submitting = false;
		}
	}

	function handleClose() {
		open = false;
		onClose();
	}
</script>

<Dialog bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>Añadir Festivo de Empresa</DialogTitle>
			<DialogDescription>
				Añade un día festivo personalizado para tu empresa. Estos días se aplicarán a todos los
				empleados.
			</DialogDescription>
		</DialogHeader>

		<form onsubmit={handleSubmit} class="grid gap-4 py-4">
			<div class="grid gap-2">
				<Label for="name">Nombre del festivo</Label>
				<Input
					id="name"
					bind:value={name}
					placeholder="Ej: Cierre navideño, Fiesta local..."
					disabled={submitting}
				/>
			</div>

			<div class="grid gap-2">
				<Label>Fecha</Label>
				<Popover bind:open={datePopoverOpen}>
					<PopoverTrigger>
						<Button
							variant="outline"
							class="w-full justify-start text-left font-normal"
							disabled={submitting}
						>
							<span class="material-symbols-rounded text-lg! mr-2">calendar_today</span>
							{selectedDate ? formatDate(selectedDate) : 'Seleccionar fecha'}
						</Button>
					</PopoverTrigger>
					<PopoverContent class="w-auto p-0" align="start">
						<CalendarPicker
							type="single"
							bind:value={selectedDate}
							onValueChange={() => {
								datePopoverOpen = false;
							}}
						/>
					</PopoverContent>
				</Popover>
			</div>

			<div class="flex items-center gap-3">
				<Switch id="isRecurring" bind:checked={isRecurring} disabled={submitting} />
				<div>
					<Label for="isRecurring" class="cursor-pointer">Repetir cada año</Label>
					<p class="text-xs text-muted-foreground">
						El festivo se aplicará automáticamente todos los años
					</p>
				</div>
			</div>

			{#if error}
				<div class="text-sm text-destructive">{error}</div>
			{/if}

			<DialogFooter class="gap-2">
				<Button
					type="button"
					variant="outline"
					onclick={handleClose}
					disabled={submitting || success}
				>
					Cancelar
				</Button>
				<Button
					type="submit"
					variant={success ? 'success' : 'default'}
					disabled={submitting || success}
					class="min-w-[130px] transition-all duration-300"
				>
					{#if submitting}
						<span class="material-symbols-rounded animate-spin text-lg!">progress_activity</span>
						Añadiendo...
					{:else if success}
						<span class="material-symbols-rounded text-lg! animate-in zoom-in duration-200"
							>check_circle</span
						>
						Añadido
					{:else}
						Añadir festivo
					{/if}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { submitBugReport } from '$lib/api/support';
	import { isAdmin as isAdminStore } from '$lib/stores/auth';
	import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';

	let pageUrl = $state('');
	let occurredAt = $state('');
	let category = $state('');
	let severity = $state('');
	let description = $state('');
	let stepsToReproduce = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);
	let isUserAdmin = $state(false);

	// All available routes/views
	const allRoutes = [
		{ value: '/', label: 'Fichajes' },
		{ value: '/profile', label: 'Perfil' },
		{ value: '/admin', label: 'Configuración', adminOnly: true },
		{ value: '/analytics', label: 'Analíticas', adminOnly: true }
	];

	const categoryOptions = [
		{ value: 'ui', label: 'Problema de interfaz' },
		{ value: 'functionality', label: 'Funcionalidad' },
		{ value: 'performance', label: 'Rendimiento' },
		{ value: 'data', label: 'Problema de datos' },
		{ value: 'other', label: 'Otro' }
	];

	const severityOptions = [
		{ value: 'low', label: 'Baja' },
		{ value: 'medium', label: 'Media' },
		{ value: 'high', label: 'Alta' },
		{ value: 'critical', label: 'Crítica' }
	];

	// Filter routes based on admin status
	const availableRoutes = $derived(
		allRoutes.filter((route) => !route.adminOnly || isUserAdmin)
	);

	$effect(() => {
		const unsubscribe = isAdminStore.subscribe((value) => {
			isUserAdmin = value;
		});
		return unsubscribe;
	});

	// Set initial pageUrl when availableRoutes changes and pageUrl is empty
	$effect(() => {
		if (!pageUrl && availableRoutes.length > 0) {
			const currentPath = $page.url.pathname;
			const currentRoute = availableRoutes.find((r) => r.value === currentPath);
			if (currentRoute) {
				pageUrl = currentPath;
			}
		}
	});

	onMount(() => {
		// Pre-fill occurredAt with current datetime
		const now = new Date();
		// Format for datetime-local input (YYYY-MM-DDTHH:mm)
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const hours = String(now.getHours()).padStart(2, '0');
		const minutes = String(now.getMinutes()).padStart(2, '0');
		occurredAt = `${year}-${month}-${day}T${hours}:${minutes}`;
	});

	async function handleSubmit() {
		error = null;
		success = false;

		if (!pageUrl.trim()) {
			error = 'La página o vista es obligatoria';
			return;
		}

		if (!occurredAt) {
			error = 'La fecha y hora son obligatorias';
			return;
		}

		if (!category) {
			error = 'La categoría es obligatoria';
			return;
		}

		if (!severity) {
			error = 'La severidad es obligatoria';
			return;
		}

		if (!description.trim()) {
			error = 'La descripción es obligatoria';
			return;
		}

		submitting = true;

		try {
			// Convert datetime-local to ISO string
			const occurredAtDate = new Date(occurredAt);
			const occurredAtISO = occurredAtDate.toISOString();

			await submitBugReport({
				page: pageUrl.trim(),
				occurredAt: occurredAtISO,
				category,
				severity,
				description: description.trim(),
				stepsToReproduce: stepsToReproduce.trim() || undefined
			});

			success = true;
			// Reset form
			const currentPath = $page.url.pathname;
			const currentRoute = availableRoutes.find((r) => r.value === currentPath);
			pageUrl = currentRoute ? currentPath : '';
			const now = new Date();
			const year = now.getFullYear();
			const month = String(now.getMonth() + 1).padStart(2, '0');
			const day = String(now.getDate()).padStart(2, '0');
			const hours = String(now.getHours()).padStart(2, '0');
			const minutes = String(now.getMinutes()).padStart(2, '0');
			occurredAt = `${year}-${month}-${day}T${hours}:${minutes}`;
			category = '';
			severity = '';
			description = '';
			stepsToReproduce = '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al enviar el reporte';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="grow flex items-center justify-center bg-background px-4 py-8">
	<div class="flex flex-col w-full max-w-2xl items-start gap-4">
		<Button
			variant="ghost"
			size="sm"
			aria-label="Volver al inicio"
			onclick={() => goto('/')}
			class="text-muted-foreground"
		>
			<span class="material-symbols-rounded text-xl!">arrow_back</span>
			Volver al inicio
		</Button>

		<Card class="w-full">
			<CardHeader>
				<CardTitle>Reportar un error</CardTitle>
				<CardDescription>
					Ayúdanos a mejorar la aplicación reportando los problemas que encuentres
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-6">
					<div class="grid gap-2">
						<Label for="page">Página o vista donde ocurrió</Label>
						<Select type="single" bind:value={pageUrl} disabled={submitting}>
							<SelectTrigger id="page" class="w-full">
								{#if pageUrl}
									{availableRoutes.find(r => r.value === pageUrl)?.label ?? pageUrl}
								{:else}
									<span class="text-muted-foreground">Selecciona una vista</span>
								{/if}
							</SelectTrigger>
							<SelectContent>
								{#each availableRoutes as route (route.value)}
									<SelectItem value={route.value} label={route.label} />
								{/each}
							</SelectContent>
						</Select>
					</div>

					<div class="grid gap-2">
						<Label for="occurredAt">¿Cuándo ocurrió?</Label>
						<Input
							id="occurredAt"
							type="datetime-local"
							bind:value={occurredAt}
							disabled={submitting}
							required
						/>
					</div>

					<div class="grid gap-2">
						<Label for="category">Categoría</Label>
						<Select type="single" bind:value={category} disabled={submitting}>
							<SelectTrigger id="category" class="w-full">
								{#if category}
									{categoryOptions.find(o => o.value === category)?.label ?? category}
								{:else}
									<span class="text-muted-foreground">Selecciona una categoría</span>
								{/if}
							</SelectTrigger>
							<SelectContent>
								{#each categoryOptions as option (option.value)}
									<SelectItem value={option.value} label={option.label} />
								{/each}
							</SelectContent>
						</Select>
					</div>

					<div class="grid gap-2">
						<Label for="severity">Severidad</Label>
						<Select type="single" bind:value={severity} disabled={submitting}>
							<SelectTrigger id="severity" class="w-full">
								{#if severity}
									{severityOptions.find(o => o.value === severity)?.label ?? severity}
								{:else}
									<span class="text-muted-foreground">Selecciona la severidad</span>
								{/if}
							</SelectTrigger>
							<SelectContent>
								{#each severityOptions as option (option.value)}
									<SelectItem value={option.value} label={option.label} />
								{/each}
							</SelectContent>
						</Select>
					</div>

					<div class="grid gap-2">
						<Label for="description">Descripción del problema</Label>
						<Textarea
							id="description"
							bind:value={description}
							placeholder="Describe detalladamente qué ocurrió..."
							disabled={submitting}
							rows={5}
							required
						/>
					</div>

					<div class="grid gap-2">
						<Label for="stepsToReproduce">Pasos para reproducir (opcional)</Label>
						<Textarea
							id="stepsToReproduce"
							bind:value={stepsToReproduce}
							placeholder="1. Ir a...&#10;2. Hacer clic en...&#10;3. Observar que..."
							disabled={submitting}
							rows={4}
						/>
					</div>

					{#if error}
						<div class="text-sm text-destructive text-center p-3 bg-destructive/10 rounded-md">
							{error}
						</div>
					{/if}

					{#if success}
						<div class="text-sm text-green-600 dark:text-green-400 text-center p-3 bg-green-50 dark:bg-green-950 rounded-md">
							¡Reporte enviado correctamente! Gracias por tu ayuda.
						</div>
					{/if}

					<div class="flex justify-end gap-2">
						<Button type="button" variant="outline" onclick={() => goto('/')} disabled={submitting}>
							Cancelar
						</Button>
						<Button type="submit" disabled={submitting}>
							{#if submitting}
								<span class="material-symbols-rounded animate-spin text-lg!">progress_activity</span>
							{:else}
								<span class="material-symbols-rounded text-lg!">bug_report</span>
							{/if}
							Enviar reporte
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	</div>
</div>


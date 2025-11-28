<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth, type AuthUser } from '$lib/stores/auth';
	import { stringToColor, getInitials } from '$lib/utils';
	import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';

	let user = $state<AuthUser | null>(null);

	$effect(() => {
		const unsubscribe = auth.subscribe((state) => {
			user = state.user;
		});
		return unsubscribe;
	});

	const avatarColor = $derived(user?.id ? stringToColor(user.id) : '#6b7280');
	const initials = $derived(user?.name ? getInitials(user.name) : '');
</script>

<div class="grow flex items-center justify-center bg-background px-4">
	<div class="flex flex-col w-full max-w-md items-start gap-2 -mt-16">
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
		<CardHeader class="space-y-4">
			<div class="flex flex-col items-center gap-4">
				<div
					class="flex items-center justify-center rounded-full text-4xl font-semibold text-white size-20"
					style="background-color: {avatarColor}"
				>
					{initials}
				</div>
				<div class="text-center">
					<CardTitle class="text-2xl font-semibold tracking-tight">{user?.name ?? ''}</CardTitle>
					<CardDescription class="mt-1">{user?.email ?? ''}</CardDescription>
				</div>
			</div>
		</CardHeader>

		<Separator />

		<CardContent class="space-y-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium">Contraseña</p>
					<p class="text-sm text-muted-foreground">Cambia tu contraseña de acceso</p>
				</div>
				<Button href="/reset-password" variant="outline" size="sm">
					Cambiar
				</Button>
			</div>
		</CardContent>
	</Card>
	</div>
</div>


<script lang="ts">
	import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Field, FieldLabel, FieldError } from '$lib/components/ui/field';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';

	export let userName: string;
	export let errorMessage: string | null;
	export let onContinue: () => void;
</script>

<Card class="shadow-lg max-w-xl w-full">
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
		<Button onclick={onContinue} disabled={!userName.trim()}>
			Siguiente
			<span class="material-symbols-rounded text-lg! ml-2">arrow_forward</span>
		</Button>
	</CardFooter>
</Card>

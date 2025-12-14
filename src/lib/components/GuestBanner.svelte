<script lang="ts">
	type Props = {
		class?: string;
	};

	let { class: className = '' }: Props = $props();
</script>

<div
	class="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border border-border rounded-md text-sm text-muted-foreground {className}"
>
	<span class="material-symbols-rounded text-base!">visibility</span>
	<span>Modo invitado - Solo lectura</span>
</div>

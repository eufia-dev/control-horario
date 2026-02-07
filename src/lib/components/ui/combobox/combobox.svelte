<script lang="ts" generics="T">
	import { tick } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Command,
		CommandInput,
		CommandList,
		CommandEmpty,
		CommandGroup,
		CommandItem
	} from '$lib/components/ui/command';
	import { Popover, PopoverTrigger, PopoverContent } from '$lib/components/ui/popover';
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		items: T[];
		value: string | undefined;
		onValueChange?: (value: string | undefined) => void;
		getItemValue: (item: T) => string;
		getItemLabel: (item: T) => string;
		placeholder?: string;
		searchPlaceholder?: string;
		emptyMessage?: string;
		disabled?: boolean;
		class?: string;
		itemSnippet?: Snippet<[{ item: T; selected: boolean }]>;
		selectedSnippet?: Snippet<[{ item: T }]>;
	}

	let {
		items,
		value = $bindable(),
		onValueChange,
		getItemValue,
		getItemLabel,
		placeholder = 'Seleccionar',
		searchPlaceholder = 'Buscar',
		emptyMessage = 'No se encontraron resultados.',
		disabled = false,
		class: className,
		itemSnippet,
		selectedSnippet
	}: Props = $props();

	let open = $state(false);
	let triggerRef = $state<HTMLButtonElement>(null!);

	const selectedItem = $derived(items.find((item) => getItemValue(item) === value));

	function closeAndFocusTrigger() {
		open = false;
		tick().then(() => {
			triggerRef?.focus();
		});
	}

	function handleSelect(item: T) {
		const newValue = getItemValue(item);
		value = newValue;
		onValueChange?.(newValue);
		closeAndFocusTrigger();
	}
</script>

<Popover bind:open>
	<PopoverTrigger bind:ref={triggerRef}>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="outline"
				class={cn('w-full justify-between min-w-0 font-normal', className)}
				role="combobox"
				aria-expanded={open}
				{disabled}
			>
				<div class="flex min-w-0 items-center truncate">
					{#if selectedItem}
						{#if selectedSnippet}
							{@render selectedSnippet({ item: selectedItem })}
						{:else}
							{getItemLabel(selectedItem)}
						{/if}
					{:else}
						<span class="text-muted-foreground">{placeholder}</span>
					{/if}
				</div>
				<span class="material-symbols-rounded text-lg! opacity-50">keyboard_arrow_down</span>
			</Button>
		{/snippet}
	</PopoverTrigger>
	<PopoverContent class="min-w-(--bits-popover-anchor-width) p-0">
		<Command>
			<CommandInput placeholder={searchPlaceholder} />
			<CommandList>
				<CommandEmpty>{emptyMessage}</CommandEmpty>
				<CommandGroup>
					{#each items as item (getItemValue(item))}
						{@const isSelected = value === getItemValue(item)}
						<CommandItem value={getItemLabel(item)} onSelect={() => handleSelect(item)}>
							<span
								class={cn('material-symbols-rounded text-lg!', !isSelected && 'text-transparent')}
								>check</span
							>
							{#if itemSnippet}
								{@render itemSnippet({ item, selected: isSelected })}
							{:else}
								{getItemLabel(item)}
							{/if}
						</CommandItem>
					{/each}
				</CommandGroup>
			</CommandList>
		</Command>
	</PopoverContent>
</Popover>

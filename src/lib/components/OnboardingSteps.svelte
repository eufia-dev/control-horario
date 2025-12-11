<script lang="ts">
	type Step = {
		label: string;
		completed?: boolean;
	};

	let { steps, currentStep = 0 }: { steps: Step[]; currentStep?: number } = $props();
</script>

<div class="flex items-center justify-center gap-2 mb-8">
	{#each steps as step, index (index)}
		<div class="flex items-center gap-2">
			<div class="flex items-center gap-2">
				<div
					class="flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors
						{index < currentStep || step.completed
						? 'bg-primary text-primary-foreground'
						: index === currentStep
							? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background'
							: 'bg-muted text-muted-foreground'}"
				>
					{#if index < currentStep || step.completed}
						<span class="material-symbols-rounded text-lg!">check</span>
					{:else}
						{index + 1}
					{/if}
				</div>
				<span
					class="text-sm font-medium hidden sm:inline
						{index <= currentStep ? 'text-foreground' : 'text-muted-foreground'}"
				>
					{step.label}
				</span>
			</div>
			{#if index < steps.length - 1}
				<div
					class="w-8 sm:w-16 h-0.5 transition-colors
						{index < currentStep ? 'bg-primary' : 'bg-muted'}"
				></div>
			{/if}
		</div>
	{/each}
</div>

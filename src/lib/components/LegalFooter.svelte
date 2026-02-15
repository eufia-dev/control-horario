<script lang="ts">
	import { resolve } from '$app/paths';
	import { LEGAL_COMPANY } from '$lib/legal';

	const legalLinks = [
		{ href: '/legal/privacy', label: 'Privacidad' },
		{ href: '/legal/cookies', label: 'Cookies' },
		{ href: '/legal/terms', label: 'Términos' },
		{ href: '/legal/aviso-legal', label: 'Aviso legal' },
		{ href: '/legal/dpa', label: 'DPA' }
	] as const;

	const externalLinks = [
		{ href: LEGAL_COMPANY.website, label: 'Web EUFIA' },
		{ href: `${LEGAL_COMPANY.website}/#conocenos`, label: 'Sobre EUFIA' }
	] as const;

	const currentYear = new Date().getFullYear();
</script>

<footer class="border-t border-border bg-background/90 px-4 py-6">
	<div
		class="mx-auto flex w-full max-w-7xl flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between"
	>
		<div class="space-y-1">
			<p class="font-medium text-foreground">{LEGAL_COMPANY.serviceName}</p>
			<p>
				© {currentYear}
				{LEGAL_COMPANY.name} · CIF {LEGAL_COMPANY.cif}
			</p>
		</div>

		<nav class="flex flex-wrap items-center gap-x-4 gap-y-2">
			{#each legalLinks as link (link.href)}
				<a
					href={resolve(link.href)}
					class="hover:text-foreground transition-colors underline-offset-4 hover:underline"
				>
					{link.label}
				</a>
			{/each}
			{#each externalLinks as link (link.href)}
				<a
					href={link.href}
					target="_blank"
					rel="noopener noreferrer"
					class="hover:text-foreground transition-colors underline-offset-4 hover:underline"
				>
					{link.label}
				</a>
			{/each}
		</nav>
	</div>
</footer>

<script lang="ts">
	import LegalPageShell from '$lib/components/LegalPageShell.svelte';
	import { LEGAL_DOCUMENTS } from '$lib/legal';

	const documentMeta = LEGAL_DOCUMENTS.COOKIES;
</script>

<LegalPageShell
	title={documentMeta.title}
	description="Información sobre el uso de cookies y tecnologías similares en EUFIA Control Horario."
	version={documentMeta.version}
	lastUpdated={documentMeta.lastUpdated}
>
	<h2 class="text-lg font-semibold">1. Qué son las cookies</h2>
	<p>
		Las cookies son pequeños archivos que se almacenan en tu navegador para permitir el
		funcionamiento técnico de un sitio o servicio digital.
	</p>

	<h2 class="text-lg font-semibold">2. Cookies que utiliza este servicio</h2>
	<p>
		En este servicio usamos exclusivamente <strong>cookies técnicas y esenciales</strong> necesarias
		para autenticación, mantenimiento de sesión y seguridad.
	</p>
	<ul class="list-disc pl-5 space-y-1">
		<li>No usamos cookies de analítica.</li>
		<li>No usamos cookies publicitarias ni de perfilado.</li>
		<li>No vendemos ni compartimos datos para marketing comportamental.</li>
	</ul>

	<h2 class="text-lg font-semibold">3. Base jurídica</h2>
	<p>
		Las cookies técnicas se utilizan por necesidad técnica del servicio y seguridad (interés
		legítimo y ejecución de la relación contractual/precontractual cuando aplica).
	</p>

	<h2 class="text-lg font-semibold">4. Gestión desde el navegador</h2>
	<p>
		Puedes configurar tu navegador para bloquear o eliminar cookies. Ten en cuenta que, si bloqueas
		cookies técnicas esenciales, la plataforma puede dejar de funcionar correctamente (por ejemplo,
		inicio de sesión).
	</p>

	<h2 class="text-lg font-semibold">5. Cambios en esta política</h2>
	<p>
		Si en el futuro incorporamos nuevas cookies (por ejemplo, analíticas), actualizaremos esta
		política para indicar tipo, finalidad, duración y, en su caso, mecanismos de consentimiento.
	</p>
</LegalPageShell>

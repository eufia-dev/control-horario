<script lang="ts">
	import LegalPageShell from '$lib/components/LegalPageShell.svelte';
	import { LEGAL_COMPANY, LEGAL_DOCUMENTS } from '$lib/legal';

	const documentMeta = LEGAL_DOCUMENTS.AVISO_LEGAL;
</script>

<LegalPageShell
	title={documentMeta.title}
	description="Información legal sobre titularidad, uso del sitio y condiciones generales de acceso."
	version={documentMeta.version}
	lastUpdated={documentMeta.lastUpdated}
>
	<h2 class="text-lg font-semibold">1. Titularidad del sitio y del servicio</h2>
	<ul class="list-disc pl-5 space-y-1">
		<li><strong>Denominación social:</strong> {LEGAL_COMPANY.name}</li>
		<li><strong>CIF:</strong> {LEGAL_COMPANY.cif}</li>
		<li><strong>Domicilio:</strong> {LEGAL_COMPANY.address}</li>
		<li><strong>Registro:</strong> {LEGAL_COMPANY.registry}</li>
		<li>
			<strong>Email:</strong>
			<a class="underline" href={`mailto:${LEGAL_COMPANY.email}`}>{LEGAL_COMPANY.email}</a>
		</li>
		<li><strong>Teléfono:</strong> {LEGAL_COMPANY.phone}</li>
		<li>
			<strong>Web:</strong>
			<a class="underline" href="https://www.eufia.eu">https://www.eufia.eu</a>
		</li>
	</ul>

	<h2 class="text-lg font-semibold">2. Uso del sitio y de la plataforma</h2>
	<p>
		El acceso a esta web y a la plataforma implica la aceptación de este aviso legal y de los
		documentos complementarios publicados (privacidad, cookies, términos y DPA).
	</p>
	<p>
		El usuario se compromete a utilizar los servicios de forma diligente, lícita y conforme a la
		buena fe, sin realizar conductas que puedan dañar la infraestructura, los sistemas o los
		derechos de terceros.
	</p>

	<h2 class="text-lg font-semibold">3. Propiedad intelectual e industrial</h2>
	<p>
		Los contenidos, marcas, diseños, código y elementos del servicio son titularidad de EUFIA o de
		sus licenciantes. Queda prohibida su reproducción, distribución o transformación sin
		autorización expresa, salvo los usos permitidos legalmente.
	</p>

	<h2 class="text-lg font-semibold">4. Responsabilidad y disponibilidad</h2>
	<p>
		EUFIA adopta medidas razonables para mantener la seguridad y continuidad del servicio, pero no
		garantiza disponibilidad ininterrumpida. No será responsable por incidencias derivadas de causas
		externas, fuerza mayor o actuaciones de terceros fuera de su control razonable.
	</p>

	<h2 class="text-lg font-semibold">5. Enlaces de terceros</h2>
	<p>
		Esta web puede incluir enlaces a recursos externos. EUFIA no controla ni asume responsabilidad
		por su contenido o políticas de privacidad.
	</p>

	<h2 class="text-lg font-semibold">6. Legislación y fuero</h2>
	<p>
		El presente aviso legal se rige por la legislación española. Para cualquier controversia se
		estará a los Juzgados y Tribunales de Palma de Mallorca, salvo fuero imperativo aplicable.
	</p>
</LegalPageShell>

<script lang="ts">
	import LegalPageShell from '$lib/components/LegalPageShell.svelte';
	import { LEGAL_COMPANY, LEGAL_DOCUMENTS } from '$lib/legal';

	const documentMeta = LEGAL_DOCUMENTS.PRIVACY;
</script>

<LegalPageShell
	title={documentMeta.title}
	description="Información sobre cómo tratamos datos personales en la web y en el servicio EUFIA Control Horario."
	version={documentMeta.version}
	lastUpdated={documentMeta.lastUpdated}
>
	<h2 class="text-lg font-semibold">1. Responsable del tratamiento</h2>
	<p>
		El responsable del tratamiento es <strong>{LEGAL_COMPANY.name}</strong>, con CIF
		<strong> {LEGAL_COMPANY.cif}</strong> y domicilio en {LEGAL_COMPANY.address}. Datos registrales:
		{LEGAL_COMPANY.registry}
	</p>
	<p>
		Puedes contactar en <a class="underline" href={`mailto:${LEGAL_COMPANY.email}`}
			>{LEGAL_COMPANY.email}</a
		>.
	</p>

	<h2 class="text-lg font-semibold">2. Datos que tratamos</h2>
	<ul class="list-disc pl-5 space-y-1">
		<li>
			<strong>Formularios de contacto:</strong> correo electrónico, nombre de empresa (opcional), tipo
			de solicitud y mensaje.
		</li>
		<li>
			<strong>Navegación y seguridad:</strong> registros técnicos mínimos (como IP, fecha y trazas técnicas
			de acceso) necesarios para seguridad y mantenimiento.
		</li>
		<li>
			<strong>Usuarios de la plataforma:</strong> datos de cuenta y actividad necesarios para prestar
			el servicio de control horario.
		</li>
	</ul>

	<h2 class="text-lg font-semibold">3. Finalidades y base jurídica</h2>
	<ul class="list-disc pl-5 space-y-1">
		<li>
			Gestionar solicitudes de información y demos (art. 6.1.b RGPD, medidas precontractuales).
		</li>
		<li>
			Atender consultas generales y proteger la seguridad del servicio (art. 6.1.f RGPD, interés
			legítimo).
		</li>
		<li>Cumplir obligaciones legales aplicables (art. 6.1.c RGPD).</li>
	</ul>

	<h2 class="text-lg font-semibold">4. Rol en la plataforma (B2B)</h2>
	<p>
		En el uso de EUFIA Control Horario para gestión de empleados, la empresa cliente actúa como
		<strong> Responsable del Tratamiento</strong> y EUFIA actúa como
		<strong> Encargado del Tratamiento</strong>, según el DPA disponible en esta web.
	</p>

	<h2 class="text-lg font-semibold">5. Destinatarios y subencargados</h2>
	<p>
		No vendemos datos personales. Compartimos datos únicamente con proveedores necesarios para
		operar el servicio.
	</p>
	<ul class="list-disc pl-5 space-y-1">
		<li>Vercel (hosting frontend).</li>
		<li>Google Workspace / Gmail (infraestructura de correo).</li>
		<li>Supabase (autenticación y servicios técnicos asociados).</li>
		<li>Railway (infraestructura backend actual).</li>
		<li>Hetzner (infraestructura backend prevista, cuando aplique la migración).</li>
	</ul>

	<h2 class="text-lg font-semibold">6. Plazos de conservación</h2>
	<ul class="list-disc pl-5 space-y-1">
		<li>
			Datos de contacto: máximo 12 meses desde la última interacción, salvo obligación legal
			superior.
		</li>
		<li>
			Logs técnicos: durante el tiempo estrictamente necesario para seguridad, auditoría y
			cumplimiento.
		</li>
		<li>
			Datos de cliente en plataforma: según contrato, instrucciones del cliente y normativa
			aplicable.
		</li>
	</ul>

	<h2 class="text-lg font-semibold">7. Derechos de las personas interesadas</h2>
	<p>
		Puedes ejercer derechos de acceso, rectificación, supresión, limitación, portabilidad y
		oposición enviando un correo a <a class="underline" href={`mailto:${LEGAL_COMPANY.email}`}
			>{LEGAL_COMPANY.email}</a
		>
		con asunto <strong>“Ejercicio de derechos RGPD”</strong>.
	</p>

	<h2 class="text-lg font-semibold">8. Reclamaciones</h2>
	<p>
		Si consideras que no hemos tratado tus datos correctamente, puedes reclamar ante la Agencia
		Española de Protección de Datos (AEPD), sin perjuicio de cualquier otra acción administrativa o
		judicial.
	</p>
</LegalPageShell>

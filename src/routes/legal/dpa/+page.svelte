<script lang="ts">
	import LegalPageShell from '$lib/components/LegalPageShell.svelte';
	import { LEGAL_COMPANY, LEGAL_DOCUMENTS } from '$lib/legal';

	const documentMeta = LEGAL_DOCUMENTS.DPA;
</script>

<LegalPageShell
	title={documentMeta.title}
	description="Condiciones de tratamiento de datos personales cuando el cliente usa la plataforma para gestionar empleados."
	version={documentMeta.version}
	lastUpdated={documentMeta.lastUpdated}
>
	<h2 class="text-lg font-semibold">1. Partes y roles</h2>
	<p>
		Este acuerdo complementa los Términos del servicio entre el cliente y {LEGAL_COMPANY.name}. El
		cliente actúa como <strong>Responsable del Tratamiento</strong> y EUFIA como
		<strong> Encargado del Tratamiento</strong>.
	</p>

	<h2 class="text-lg font-semibold">2. Objeto y duración</h2>
	<p>
		El encargo tiene por objeto la prestación de {LEGAL_COMPANY.serviceName} para control horario, gestión
		de jornada y funciones asociadas. El tratamiento se mantiene durante la vigencia contractual.
	</p>

	<h2 class="text-lg font-semibold">3. Naturaleza y finalidad del tratamiento</h2>
	<ul class="list-disc pl-5 space-y-1">
		<li>Registro y consulta de fichajes.</li>
		<li>Gestión de ausencias, equipos, informes y trazabilidad.</li>
		<li>Soporte técnico y seguridad operativa.</li>
	</ul>

	<h2 class="text-lg font-semibold">4. Categorías de datos y personas</h2>
	<ul class="list-disc pl-5 space-y-1">
		<li>
			<strong>Interesados:</strong> empleados, colaboradores y usuarios autorizados del cliente.
		</li>
		<li>
			<strong>Datos:</strong> identificativos y de contacto profesional, datos de jornada, ausencias
			y metadatos técnicos necesarios para el servicio.
		</li>
	</ul>

	<h2 class="text-lg font-semibold">5. Obligaciones del encargado</h2>
	<ul class="list-disc pl-5 space-y-1">
		<li>Tratar los datos solo siguiendo instrucciones documentadas del cliente.</li>
		<li>Garantizar confidencialidad y acceso restringido al personal autorizado.</li>
		<li>Aplicar medidas técnicas y organizativas de seguridad adecuadas al riesgo.</li>
		<li>
			Asistir al cliente en el ejercicio de derechos y en obligaciones de seguridad cuando proceda.
		</li>
		<li>
			Notificar sin dilación indebida incidentes de seguridad con impacto en datos personales.
		</li>
	</ul>

	<h2 class="text-lg font-semibold">6. Subencargados autorizados</h2>
	<p>
		El cliente autoriza de forma general el uso de subencargados necesarios para operar el servicio:
	</p>
	<ul class="list-disc pl-5 space-y-1">
		<li>Vercel (alojamiento/frontend).</li>
		<li>Google Workspace / Gmail (correo y comunicaciones de soporte).</li>
		<li>Supabase (autenticación e infraestructura técnica asociada).</li>
		<li>Railway (infraestructura backend actual).</li>
		<li>Hetzner (infraestructura objetivo cuando se active la migración).</li>
	</ul>
	<p>
		Cualquier cambio relevante de subencargados se notificará con antelación razonable por medios
		habituales de comunicación con clientes.
	</p>

	<h2 class="text-lg font-semibold">7. Transferencias internacionales</h2>
	<p>
		Si algún proveedor implica transferencias internacionales, EUFIA aplicará mecanismos válidos
		conforme RGPD (cláusulas contractuales tipo u otros instrumentos aplicables).
	</p>

	<h2 class="text-lg font-semibold">8. Conservación, devolución y supresión</h2>
	<p>
		A la finalización del servicio, y salvo obligación legal, EUFIA devolverá o eliminará los datos
		conforme a las instrucciones del cliente. El cliente puede solicitar exportación durante 30 días
		tras baja.
	</p>

	<h2 class="text-lg font-semibold">9. Auditoría e información</h2>
	<p>
		EUFIA pondrá a disposición del cliente la información necesaria para demostrar cumplimiento de
		obligaciones como encargado, dentro de límites razonables de seguridad y confidencialidad.
	</p>

	<h2 class="text-lg font-semibold">10. Contacto de privacidad</h2>
	<p>
		Para cuestiones de protección de datos relacionadas con este DPA:
		<a class="underline" href={`mailto:${LEGAL_COMPANY.email}`}> {LEGAL_COMPANY.email}</a>.
	</p>
</LegalPageShell>

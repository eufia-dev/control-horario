<script lang="ts">
	import LegalPageShell from '$lib/components/LegalPageShell.svelte';
	import { LEGAL_COMPANY, LEGAL_DOCUMENTS } from '$lib/legal';

	const documentMeta = LEGAL_DOCUMENTS.TERMS;
</script>

<LegalPageShell
	title={documentMeta.title}
	description="Condiciones de uso de EUFIA Control Horario para clientes profesionales y usuarios autorizados."
	version={documentMeta.version}
	lastUpdated={documentMeta.lastUpdated}
>
	<h2 class="text-lg font-semibold">1. Identificación del prestador</h2>
	<p>
		El servicio {LEGAL_COMPANY.serviceName} es titularidad de <strong>{LEGAL_COMPANY.name}</strong>
		(CIF
		{LEGAL_COMPANY.cif}), con domicilio en {LEGAL_COMPANY.address}.
	</p>

	<h2 class="text-lg font-semibold">2. Objeto del servicio</h2>
	<p>
		{LEGAL_COMPANY.serviceName} es un software de fichaje digital y control horario para empresas y profesionales
		en España, con funcionalidades como registro de jornada, gestión de equipos, informes y analíticas
		de proyectos.
	</p>

	<h2 class="text-lg font-semibold">3. Registro y cuentas</h2>
	<p>
		El cliente y los usuarios autorizados deben proporcionar información veraz y mantener la
		confidencialidad de credenciales. El cliente es responsable de los accesos autorizados dentro de
		su organización.
	</p>

	<h2 class="text-lg font-semibold">4. Planes, prueba y facturación</h2>
	<ul class="list-disc pl-5 space-y-1">
		<li>Primer mes gratuito de prueba sin requerir datos de pago al inicio.</li>
		<li>Después del periodo de prueba, facturación mensual según plan/usuarios activos.</li>
		<li>
			La cancelación puede solicitarse en cualquier momento con efecto al final del ciclo en curso.
		</li>
	</ul>

	<h2 class="text-lg font-semibold">5. Exportación y supresión tras baja</h2>
	<p>
		Tras la cancelación, el cliente podrá solicitar exportación de datos durante un plazo máximo de
		30 días, previo a la eliminación definitiva, salvo obligación legal de conservación.
	</p>

	<h2 class="text-lg font-semibold">6. Protección de datos y roles</h2>
	<p>
		En el tratamiento de datos de empleados, el cliente actúa como <strong
			>Responsable del Tratamiento</strong
		>
		y EUFIA como <strong>Encargado del Tratamiento</strong>, conforme al DPA aplicable.
	</p>

	<h2 class="text-lg font-semibold">7. Uso permitido y límites</h2>
	<p>
		No está permitido usar la plataforma para actividades ilícitas, ingeniería inversa no
		autorizada, interferencia con la seguridad o uso contrario a la normativa laboral y de
		protección de datos.
	</p>

	<h2 class="text-lg font-semibold">8. Responsabilidad</h2>
	<p>
		La responsabilidad total de EUFIA, por cualquier concepto, se limita al importe abonado por el
		cliente en los 12 meses anteriores al hecho causante. Quedan excluidos, en la medida permitida
		por ley, daños indirectos, lucro cesante y pérdida de oportunidad.
	</p>

	<h2 class="text-lg font-semibold">9. Modificaciones del servicio y de los términos</h2>
	<p>
		Podemos actualizar funcionalidades o estas condiciones por motivos legales, operativos o de
		seguridad. Las nuevas versiones se publicarán en esta página y, cuando proceda, se solicitará
		reaceptación.
	</p>

	<h2 class="text-lg font-semibold">10. Ley aplicable y jurisdicción</h2>
	<p>
		Estos términos se rigen por la legislación española. Para cuestiones litigiosas, las partes se
		someten a los Juzgados y Tribunales de Palma de Mallorca, salvo que una norma imperativa
		establezca otro fuero (por ejemplo, en materia de consumidores).
	</p>
</LegalPageShell>

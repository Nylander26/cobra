import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aviso legal | Cobra",
  description:
    "Información legal del titular de micobra.es conforme a la LSSI-CE.",
  alternates: { canonical: "/legal/aviso-legal" },
};

// Última revisión del texto. Actualizar al cambiar el contenido.
const REVISION = "13 de julio de 2026";

export default function AvisoLegalPage() {
  return (
    <>
      <h1>Aviso legal</h1>
      <p>
        En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de
        Servicios de la Sociedad de la Información y de Comercio Electrónico
        (LSSI-CE), se informa de que el sitio web{" "}
        <strong>micobra.es</strong> (en adelante, «Cobra» o «el Servicio») es
        titularidad de:
      </p>
      <ul>
        <li>
          <strong>Titular:</strong> Wolfgang Nylander Tabares, empresario
          individual (autónomo).
        </li>
        <li>
          <strong>Contacto:</strong>{" "}
          <a href="mailto:soporte@micobra.es">soporte@micobra.es</a>
        </li>
        <li>
          <strong>Dominio:</strong> micobra.es
        </li>
      </ul>

      <h2>Objeto</h2>
      <p>
        Cobra es una aplicación de recordatorios de cobro para autónomos y
        pequeñas empresas: registra facturas pendientes y envía, en nombre del
        usuario, correos de recordatorio a sus clientes conforme a una
        secuencia programada.
      </p>

      <h2>Condiciones de uso del sitio</h2>
      <p>
        El acceso a este sitio atribuye la condición de usuario e implica la
        aceptación de este aviso legal, de las{" "}
        <a href="/legal/condiciones">Condiciones del servicio</a> y de la{" "}
        <a href="/legal/privacidad">Política de privacidad</a>. El usuario se
        compromete a utilizar el sitio y el Servicio de conformidad con la ley
        y la buena fe, y a no emplearlos para fines ilícitos o lesivos de
        derechos de terceros — en particular, para el envío de comunicaciones
        no solicitadas ajenas a la reclamación de facturas propias.
      </p>

      <h2>Propiedad intelectual</h2>
      <p>
        El diseño, el código, los textos y la marca de Cobra son titularidad
        de su propietario o de sus licenciantes. No se cede ningún derecho de
        explotación más allá de lo estrictamente necesario para el uso del
        Servicio. Las facturas y datos que cada usuario introduce son y siguen
        siendo suyos.
      </p>

      <h2>Responsabilidad</h2>
      <p>
        El titular no responde del contenido de las facturas ni de las
        relaciones comerciales entre los usuarios y sus clientes. La
        calculadora de intereses de demora tiene carácter orientativo y no
        constituye asesoramiento jurídico.
      </p>

      <h2>Legislación aplicable</h2>
      <p>
        Este aviso legal se rige por la legislación española. Para cualquier
        controversia serán competentes los juzgados y tribunales españoles que
        legalmente correspondan.
      </p>

      <p>Última revisión: {REVISION}.</p>
    </>
  );
}

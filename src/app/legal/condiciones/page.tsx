import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Condiciones del servicio | Cobra",
  description:
    "Condiciones de contratación y uso de Cobra (micobra.es): planes, prueba gratuita, uso aceptable y encargo de tratamiento.",
  alternates: { canonical: "/legal/condiciones" },
};

const REVISION = "13 de julio de 2026";

export default function CondicionesPage() {
  return (
    <>
      <h1>Condiciones del servicio</h1>
      <p>
        Estas condiciones regulan la contratación y el uso de{" "}
        <strong>Cobra</strong> (micobra.es). Al crear una cuenta las aceptas
        junto con el <a href="/legal/aviso-legal">Aviso legal</a> y la{" "}
        <a href="/legal/privacidad">Política de privacidad</a>.
      </p>

      <h2>1. El servicio</h2>
      <p>
        Cobra registra tus facturas pendientes de cobro y envía recordatorios
        por email a tus clientes, en tu nombre, según la secuencia programada.
        Cobra es una herramienta de comunicación: <strong>no garantiza el
        cobro</strong> de ninguna factura ni presta servicios de recobro,
        asesoramiento jurídico o financiero. La calculadora de intereses de
        demora (Ley 3/2004) es orientativa.
      </p>

      <h2>2. Tu cuenta</h2>
      <p>
        Necesitas una cuenta con un email verificado. Eres responsable de la
        confidencialidad de tu contraseña y de la actividad realizada desde tu
        cuenta. La cuenta es personal (o de tu empresa) e intransferible.
      </p>

      <h2>3. Planes, precios y prueba gratuita</h2>
      <ul>
        <li>
          Los planes vigentes y sus límites (facturas activas, marcas, envíos
          diarios) son los publicados en la página de precios. Los precios se
          muestran en euros, por mes.
        </li>
        <li>
          Los planes de pago incluyen <strong>14 días de prueba sin
          tarjeta</strong>. Si al terminar la prueba no has añadido un método
          de pago, la suscripción se cancela sola y vuelves al plan gratuito,
          sin cargo alguno.
        </li>
        <li>
          Puedes cancelar en cualquier momento; la cancelación surte efecto al
          final del período ya pagado y no se prorratean devoluciones.
        </li>
        <li>
          El pago se procesa a través de Stripe. Los precios podrán
          actualizarse con aviso previo razonable; el cambio nunca se aplica
          retroactivamente al período ya abonado.
        </li>
      </ul>

      <h2>4. Uso aceptable</h2>
      <ul>
        <li>
          Cobra sirve <strong>exclusivamente para reclamar facturas reales y
          propias</strong>. Está prohibido usarlo para enviar comunicaciones
          comerciales no solicitadas (spam), acosar, o reclamar deudas
          inexistentes o de terceros sin legitimación.
        </li>
        <li>
          Existen topes diarios de envío por plan como salvaguarda. El uso
          fraudulento o abusivo puede conllevar la suspensión o cierre de la
          cuenta, previa comunicación cuando sea posible.
        </li>
        <li>
          Eres responsable de la veracidad de las facturas y datos que
          introduces y de tu relación con tus clientes.
        </li>
      </ul>

      <h2>5. Encargo de tratamiento (art. 28 RGPD)</h2>
      <p>
        Respecto de los datos personales de tus clientes que introduces en
        Cobra, tú eres el responsable del tratamiento y Cobra el encargado.
        En virtud de estas condiciones, Cobra: (a) tratará esos datos
        únicamente para prestar el Servicio siguiendo tus instrucciones (la
        programación de recordatorios); (b) aplicará medidas de seguridad
        adecuadas; (c) recurrirá a los subencargados listados en la{" "}
        <a href="/legal/privacidad">Política de privacidad</a>; (d) no los
        usará para fines propios ni los cederá; y (e) los suprimirá al cierre
        de tu cuenta, salvo obligación legal de conservación.
      </p>

      <h2>6. Disponibilidad y garantías</h2>
      <p>
        El Servicio se presta «tal cual», con un esfuerzo razonable de
        disponibilidad y sin garantía de continuidad absoluta. La
        responsabilidad total de Cobra frente a ti queda limitada, en la
        medida que la ley lo permita, al importe pagado por el Servicio en los
        12 meses anteriores al hecho que la origine.
      </p>

      <h2>7. Baja y cierre de cuenta</h2>
      <p>
        Puedes darte de baja en cualquier momento cancelando tu suscripción
        desde el panel y solicitando el cierre de la cuenta en{" "}
        <a href="mailto:soporte@micobra.es">soporte@micobra.es</a>. Al cierre
        se eliminan tus datos conforme a la Política de privacidad.
      </p>

      <h2>8. Cambios en estas condiciones</h2>
      <p>
        Podremos actualizar estas condiciones para reflejar cambios del
        Servicio o de la ley. Los cambios relevantes se comunicarán por email
        con antelación razonable; el uso continuado tras su entrada en vigor
        implica aceptación.
      </p>

      <h2>9. Ley aplicable</h2>
      <p>
        Estas condiciones se rigen por la legislación española. Serán
        competentes los juzgados y tribunales españoles que legalmente
        correspondan.
      </p>

      <p>Última revisión: {REVISION}.</p>
    </>
  );
}

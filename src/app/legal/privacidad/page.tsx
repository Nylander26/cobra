import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad | Cobra",
  description:
    "Cómo trata Cobra (micobra.es) los datos personales: responsable, finalidades, encargados y derechos RGPD.",
  alternates: { canonical: "/legal/privacidad" },
};

const REVISION = "13 de julio de 2026";

export default function PrivacidadPage() {
  return (
    <>
      <h1>Política de privacidad</h1>
      <p>
        Esta política describe cómo se tratan los datos personales en{" "}
        <strong>micobra.es</strong> conforme al Reglamento (UE) 2016/679
        (RGPD) y a la Ley Orgánica 3/2018 (LOPDGDD).
      </p>

      <h2>Responsable del tratamiento</h2>
      <ul>
        <li>
          <strong>Responsable:</strong> Wolfgang Nylander Tabares (titular de
          Cobra).
        </li>
        <li>
          <strong>Contacto:</strong>{" "}
          <a href="mailto:soporte@micobra.es">soporte@micobra.es</a>
        </li>
      </ul>

      <h2>Qué datos tratamos y para qué</h2>
      <ul>
        <li>
          <strong>Datos de tu cuenta</strong> (nombre, email, contraseña
          cifrada, plan contratado): para prestar el Servicio, autenticarte,
          enviarte correos transaccionales (verificación, recuperación de
          contraseña, resumen semanal) y gestionar la facturación. Base legal:
          ejecución del contrato (art. 6.1.b RGPD).
        </li>
        <li>
          <strong>Datos de tus clientes que tú introduces</strong> (empresa,
          persona de contacto, email de facturación, facturas y sus importes):
          se tratan exclusivamente para enviar los recordatorios de cobro que
          tú programas. Respecto de estos datos <strong>tú eres el
          responsable</strong> y Cobra actúa como <strong>encargado del
          tratamiento</strong> (art. 28 RGPD), en los términos de las{" "}
          <a href="/legal/condiciones">Condiciones del servicio</a>.
        </li>
        <li>
          <strong>Datos técnicos de los envíos</strong> (entrega, rebote,
          queja y apertura de los correos): para informarte del estado de tus
          recordatorios y proteger la entregabilidad del sistema. Base legal:
          interés legítimo (art. 6.1.f RGPD).
        </li>
        <li>
          <strong>Datos de pago:</strong> el cobro de las suscripciones lo
          procesa Stripe. Cobra <strong>no almacena</strong> números de
          tarjeta.
        </li>
      </ul>

      <h2>Dónde se alojan y quién nos ayuda a tratarlos</h2>
      <p>
        Utilizamos proveedores que actúan como encargados o subencargados del
        tratamiento:
      </p>
      <ul>
        <li>
          <strong>Neon</strong> — base de datos, alojada en la región UE
          (Fráncfort, eu-central-1).
        </li>
        <li>
          <strong>Vercel</strong> — alojamiento de la aplicación.
        </li>
        <li>
          <strong>Resend / Amazon SES</strong> — envío de correo, región UE
          (Irlanda, eu-west-1).
        </li>
        <li>
          <strong>Amazon Web Services (S3)</strong> — almacenamiento de los
          PDF de facturas, región UE (París, eu-west-3).
        </li>
        <li>
          <strong>Stripe</strong> — procesamiento de pagos.
        </li>
      </ul>
      <p>
        Algunos de estos proveedores son empresas estadounidenses; cuando ello
        implica transferencias internacionales, se amparan en el EU-U.S. Data
        Privacy Framework o en cláusulas contractuales tipo aprobadas por la
        Comisión Europea.
      </p>

      <h2>Cuánto tiempo conservamos los datos</h2>
      <p>
        Mientras mantengas tu cuenta. Si la cierras, eliminamos tus datos y
        los de tus clientes en un plazo máximo de 30 días, salvo lo que deba
        conservarse por obligación legal (por ejemplo, registros de
        facturación).
      </p>

      <h2>Cookies</h2>
      <p>
        Cobra solo utiliza <strong>cookies técnicas de sesión</strong>,
        imprescindibles para mantener tu sesión iniciada. No usamos cookies de
        analítica ni de publicidad, ni cookies de terceros; por eso no
        mostramos banner de consentimiento (art. 22.2 LSSI-CE).
      </p>

      <h2>Tus derechos</h2>
      <p>
        Puedes ejercer tus derechos de acceso, rectificación, supresión,
        oposición, limitación y portabilidad escribiendo a{" "}
        <a href="mailto:soporte@micobra.es">soporte@micobra.es</a>. Si crees
        que no los hemos atendido debidamente, puedes reclamar ante la Agencia
        Española de Protección de Datos (aepd.es).
      </p>

      <h2>Si eres cliente de un usuario de Cobra</h2>
      <p>
        Si has recibido un recordatorio de cobro enviado a través de Cobra, el
        responsable de tus datos es la persona o empresa que te lo envió (el
        remitente del correo). Cobra solo procesa tu email y los datos de la
        factura por encargo suyo. Puedes dirigir el ejercicio de tus derechos
        al remitente, o escribirnos a soporte@micobra.es y trasladaremos tu
        solicitud.
      </p>

      <p>Última revisión: {REVISION}.</p>
    </>
  );
}

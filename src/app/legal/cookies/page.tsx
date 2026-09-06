import type { Metadata } from "next";
import { BotonPreferencias } from "@/components/consent/boton-preferencias";

export const metadata: Metadata = {
  title: "Política de cookies | Cobra",
  description:
    "Qué cookies usa Cobra (micobra.es), para qué sirven, cuánto duran y cómo aceptarlas, rechazarlas o cambiar de opinión.",
  alternates: { canonical: "/legal/cookies" },
};

const REVISION = "17 de agosto de 2026";

export default function CookiesPage() {
  return (
    <>
      <h1>Política de cookies</h1>
      <p>
        Esta política explica qué cookies y tecnologías similares utiliza{" "}
        <strong>micobra.es</strong>, con qué finalidad y durante cuánto tiempo,
        conforme al artículo 22 de la Ley 34/2002 (LSSI-CE) y a la{" "}
        <a href="/legal/privacidad">política de privacidad</a>.
      </p>

      <h2>Qué es una cookie</h2>
      <p>
        Un fichero pequeño que un sitio web guarda en tu navegador para
        recordar algo entre una visita y la siguiente: que has iniciado sesión,
        qué preferencias elegiste o desde qué anuncio llegaste.
      </p>

      <h2>Cómo pedimos tu permiso</h2>
      <p>
        La primera vez que entras te mostramos un aviso con tres opciones:
        aceptar todo, rechazar todo o elegir por categorías.{" "}
        <strong>
          Hasta que no aceptes, no se carga ninguna cookie que no sea
          estrictamente necesaria
        </strong>
        : ni de analítica, ni de publicidad, ni de terceros. Rechazar cuesta un
        solo clic, igual que aceptar, y puedes cambiar de opinión cuando
        quieras desde el enlace del final de esta página.
      </p>

      <h2>Cookies necesarias</h2>
      <p>
        Se instalan siempre porque sin ellas el servicio no funciona. No
        requieren consentimiento (art. 22.2 LSSI-CE).
      </p>
      <ul>
        <li>
          <strong>Cookie de sesión de Cobra</strong> — propia. Mantiene tu
          sesión iniciada para que no tengas que escribir la contraseña en cada
          página. Caduca al cerrar la sesión.
        </li>
        <li>
          <strong>cobra_consent</strong> — propia. Guarda exactamente qué
          categorías has aceptado y la fecha en que lo hiciste, para no volver a
          preguntarte y para poder acreditar tu decisión. Dura 180 días.
        </li>
      </ul>

      <h2>Cookies de analítica</h2>
      <p>
        Solo con tu consentimiento. Nos dicen cuántas visitas recibe cada
        página, en datos agregados. Usamos Vercel Web Analytics, que{" "}
        <strong>no instala cookies ni identificadores personales</strong>: la
        categoría existe para que puedas desactivar también esta medición si lo
        prefieres.
      </p>

      <h2>Cookies de marketing</h2>
      <p>
        Solo con tu consentimiento (art. 6.1.a RGPD). Las instala{" "}
        <strong>Meta Platforms Ireland Ltd.</strong> a través del píxel de Meta
        y sirven para saber qué anuncio te trajo hasta aquí, medir si la
        publicidad funciona y evitar volver a enseñarte el mismo anuncio.
      </p>
      <ul>
        <li>
          <strong>_fbp</strong> — de Meta. Identifica tu navegador para atribuir
          la visita a una campaña. Dura 90 días.
        </li>
        <li>
          <strong>_fbc</strong> — de Meta. Guarda el identificador del anuncio
          concreto en el que hiciste clic. Dura 90 días.
        </li>
        <li>
          <strong>cobra_campana</strong> — propia. Guarda únicamente los
          parámetros de campaña que venían en el enlace por el que llegaste
          (<em>utm_source</em>, <em>utm_campaign</em> y similares), para saber
          qué anuncio funciona sin depender de la medición de Meta. No contiene
          ningún dato que te identifique. Dura 30 días y se instala también si
          aceptas solo la categoría de analítica.
        </li>
      </ul>
      <p>
        Si aceptas esta categoría, también enviamos a Meta desde nuestros
        servidores determinados eventos (por ejemplo, que has creado una cuenta
        o contratado un plan) con tu{" "}
        <strong>correo cifrado mediante SHA-256</strong>, de forma que Meta
        pueda medir la conversión sin que le enviemos tu dirección en claro.
        Meta es una empresa estadounidense y estas transferencias se amparan en
        el EU-U.S. Data Privacy Framework.
      </p>

      <h2>Cómo cambiar de opinión</h2>
      <p>
        Puedes revisar o retirar tu consentimiento en cualquier momento, y es
        tan sencillo como darlo:
      </p>
      <p>
        <BotonPreferencias className="text-cobra underline underline-offset-4" />
      </p>
      <p>
        También puedes borrar o bloquear las cookies desde la configuración de
        tu navegador. Si bloqueas las necesarias, es posible que no puedas
        iniciar sesión.
      </p>

      <h2>Tus derechos</h2>
      <p>
        Puedes ejercer tus derechos de acceso, rectificación, supresión,
        oposición, limitación y portabilidad escribiendo a{" "}
        <a href="mailto:soporte@micobra.es">soporte@micobra.es</a>, y reclamar
        ante la Agencia Española de Protección de Datos (aepd.es). Más detalle
        en la <a href="/legal/privacidad">política de privacidad</a>.
      </p>

      <p>Última revisión: {REVISION}.</p>
    </>
  );
}

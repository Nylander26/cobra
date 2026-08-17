import { createHash } from "node:crypto";

// Conversions API de Meta: la capa servidor de la medición. Existe porque el
// píxel de navegador pierde entre un 30 % y un 40 % de los eventos (adblock,
// ITP de Safari, iOS), y porque la venta real ocurre en un webhook de Stripe
// donde no hay navegador que dispare nada.
//
// Regla de oro de este módulo: NUNCA lanza. Lo llaman un webhook de Stripe y
// hooks de autenticación; si Meta falla, ese webhook tiene que seguir
// devolviendo 200 o Stripe reintenta y se duplica el trabajo de base de datos.

const GRAPH_VERSION = "v21.0";

export type MetaUserData = {
  email?: string | null;
  externalId?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  clientIp?: string | null;
  clientUserAgent?: string | null;
};

export type MetaEvent = {
  eventName: string;
  // Meta deduplica por (eventName, eventId) en una ventana de 48 h. Para los
  // eventos que van por píxel y CAPI a la vez, el id nace en el navegador y
  // viaja hasta aquí. Para los de webhook es determinista, y así un reintento
  // de Stripe no cuenta como una venta más.
  eventId: string;
  eventSourceUrl?: string;
  actionSource?: "website" | "system_generated";
  userData: MetaUserData;
  customData?: Record<string, unknown>;
};

// Meta exige SHA-256 sobre el valor normalizado. node:crypto y no Web Crypto:
// todo esto corre en runtime Node en Vercel y createHash es síncrono, así que
// no obliga a un await dentro de un hook de auth.
export function hashMeta(valor: string | null | undefined): string | undefined {
  if (!valor) return undefined;
  const normalizado = valor.trim().toLowerCase();
  if (!normalizado) return undefined;
  return createHash("sha256").update(normalizado).digest("hex");
}

function construirUserData(datos: MetaUserData) {
  // fbp, fbc, IP y user-agent van SIN hashear: Meta lo prohíbe expresamente.
  // Solo se hashea lo que identifica a una persona.
  const userData: Record<string, unknown> = {};
  const em = hashMeta(datos.email);
  if (em) userData.em = [em];
  const externalId = hashMeta(datos.externalId);
  if (externalId) userData.external_id = [externalId];
  if (datos.fbp) userData.fbp = datos.fbp;
  if (datos.fbc) userData.fbc = datos.fbc;
  if (datos.clientIp) userData.client_ip_address = datos.clientIp;
  if (datos.clientUserAgent) userData.client_user_agent = datos.clientUserAgent;
  return userData;
}

export async function enviarEventoMeta(evento: MetaEvent): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;

  // Degradar, no crashear: sin credenciales el dev local y los previews no
  // ensucian los datos de producción y todo lo demás sigue funcionando.
  if (!pixelId || !token) return;

  try {
    const cuerpo: Record<string, unknown> = {
      data: [
        {
          event_name: evento.eventName,
          // Segundos, no milisegundos. Y calculado aquí dentro: Date.now() en
          // module scope está prohibido con cacheComponents.
          event_time: Math.floor(Date.now() / 1000),
          event_id: evento.eventId,
          event_source_url: evento.eventSourceUrl,
          action_source: evento.actionSource ?? "website",
          user_data: construirUserData(evento.userData),
          custom_data: evento.customData,
        },
      ],
    };
    // En la raíz del body, no dentro de `data`. Solo definido en local/preview.
    if (process.env.META_CAPI_TEST_EVENT_CODE) {
      cuerpo.test_event_code = process.env.META_CAPI_TEST_EVENT_CODE;
    }

    const respuesta = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cuerpo),
        cache: "no-store",
        // Nadie espera por Meta: ni un webhook de Stripe ni un alta de usuario.
        signal: AbortSignal.timeout(3000),
      },
    );

    if (!respuesta.ok) {
      console.error(
        `[meta-capi] ${evento.eventName} rechazado (${respuesta.status}): ${await respuesta.text()}`,
      );
    }
  } catch (err) {
    console.error(`[meta-capi] ${evento.eventName} falló:`, err);
  }
}

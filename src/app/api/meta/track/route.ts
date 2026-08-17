import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { CONSENT_COOKIE, parseConsent, tieneMarketing } from "@/lib/consent";
import { guardarAtribucion } from "@/lib/meta/attrib";
import { enviarEventoMeta } from "@/lib/meta/capi";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";

// Puente navegador → Conversions API. Su razón de ser es que este endpoint es
// de primera parte: los bloqueadores filtran connect.facebook.net, no
// micobra.es. Un evento que el píxel pierde por adblock llega igual por aquí.
//
// Además es el único sitio donde coinciden las tres cosas que Meta necesita
// para emparejar bien: las cookies _fbp/_fbc, la IP y el user-agent reales.

// Lista blanca: no se reenvía a Meta cualquier cadena que llegue en el body.
const EVENTOS_PERMITIDOS = new Set(["Lead", "ViewContent", "InitiateCheckout"]);

type Cuerpo = {
  name?: unknown;
  eventId?: unknown;
  email?: unknown;
  customData?: unknown;
};

export async function POST(req: Request) {
  const cookieStore = await cookies();

  // Doble verificación: el cliente ya comprueba el consentimiento, pero un
  // POST directo no pasa por el cliente.
  const consent = parseConsent(cookieStore.get(CONSENT_COOKIE)?.value);
  if (!tieneMarketing(consent)) return new NextResponse(null, { status: 204 });

  let cuerpo: Cuerpo;
  try {
    cuerpo = (await req.json()) as Cuerpo;
  } catch {
    return new NextResponse("Cuerpo inválido", { status: 400 });
  }

  const name = typeof cuerpo.name === "string" ? cuerpo.name : "";
  const eventId = typeof cuerpo.eventId === "string" ? cuerpo.eventId : "";
  if (!EVENTOS_PERMITIDOS.has(name) || !eventId) {
    return new NextResponse("Evento no admitido", { status: 400 });
  }

  const h = await headers();
  const clientIp = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const clientUserAgent = h.get("user-agent");

  // Endpoint público: sin límite, cualquiera podría inundar el dataset de
  // eventos falsos y arruinar la optimización de las campañas.
  const permitido = await checkRateLimit(`meta:${clientIp ?? "sin-ip"}`, {
    max: 30,
    windowSeconds: 60,
  });
  if (!permitido) return new NextResponse("Demasiadas peticiones", { status: 429 });

  const fbp = cookieStore.get("_fbp")?.value ?? null;
  const fbc = cookieStore.get("_fbc")?.value ?? null;

  // Si hay sesión, el user.id sirve de external_id y sube el emparejamiento.
  // El email del body solo se usa cuando aún no hay sesión (el alta todavía no
  // ha verificado el correo, así que no hay cookie de sesión que valga).
  const session = await getSession();
  const userId = session?.user.id ?? null;
  const email =
    session?.user.email ??
    (typeof cuerpo.email === "string" ? cuerpo.email : null);

  if (userId) {
    // Se guarda para que el webhook de Stripe pueda atribuir la venta dentro
    // de catorce días, cuando ya no haya navegador.
    await guardarAtribucion(userId, { fbp, fbc, clientIp, clientUserAgent });
  }

  await enviarEventoMeta({
    eventName: name,
    eventId,
    eventSourceUrl: h.get("referer") ?? undefined,
    actionSource: "website",
    userData: { email, externalId: userId, fbp, fbc, clientIp, clientUserAgent },
    customData:
      typeof cuerpo.customData === "object" && cuerpo.customData !== null
        ? (cuerpo.customData as Record<string, unknown>)
        : undefined,
  });

  return new NextResponse(null, { status: 204 });
}

import { and, count, eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { db } from "@/db";
import { events } from "@/db/schema";
import { CONSENT_COOKIE, parseConsent, tieneMarketing } from "@/lib/consent";
import {
  atribucionDeHeaders,
  combinarAtribucion,
  leerAtribucion,
} from "@/lib/meta/attrib";
import { enviarEventoMeta } from "@/lib/meta/capi";

// La primera factura es la activación real de Cobra: hasta que hay una, no se
// programa ningún recordatorio y el producto no ha hecho nada por el usuario.
// Un alta sin factura es tráfico que resonó con el anuncio pero no tenía nada
// que cobrar, así que este es el evento por el que conviene optimizar las
// campañas, no por la visita ni por el registro.
//
// Evento personalizado: Meta no tiene uno estándar que signifique esto. Para
// optimizar por él hay que crear una conversión personalizada sobre
// `PrimeraFactura` en el Administrador de eventos.
const EVENTO = "PrimeraFactura";

// Se llama justo DESPUÉS de insertar el `invoice_created` de la factura, así
// que "primera" es "la única que hay". Solo servidor: la factura nace en una
// server action y aquí ya están las cookies del navegador que la creó.
export async function reportarPrimeraFactura(
  usuario: { id: string; email: string },
  origen: string,
): Promise<void> {
  try {
    const [{ total }] = await db
      .select({ total: count() })
      .from(events)
      .where(and(eq(events.userId, usuario.id), eq(events.type, "invoice_created")));
    if (total !== 1) return;

    // Igual que /api/meta/track: sin consentimiento de marketing no sale nada
    // hacia Meta. El embudo propio (scripts/embudo.mjs) la cuenta igual.
    const cookieStore = await cookies();
    if (!tieneMarketing(parseConsent(cookieStore.get(CONSENT_COOKIE)?.value))) return;

    const h = await headers();
    const atribucion = combinarAtribucion(
      atribucionDeHeaders(h),
      await leerAtribucion(usuario.id),
    );

    await enviarEventoMeta({
      eventName: EVENTO,
      // Determinista: dos pestañas creando la primera factura a la vez cuentan
      // como una sola activación.
      eventId: `fac1_${usuario.id}`,
      eventSourceUrl: h.get("referer") ?? undefined,
      actionSource: "website",
      userData: {
        email: usuario.email,
        externalId: usuario.id,
        fbp: atribucion.fbp,
        fbc: atribucion.fbc,
        clientIp: atribucion.clientIp,
        clientUserAgent: atribucion.clientUserAgent,
      },
      customData: { origen },
    });
  } catch (err) {
    // La medición nunca puede tumbar el alta de una factura.
    console.error("[meta] no se pudo reportar la primera factura:", err);
  }
}

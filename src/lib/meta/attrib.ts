import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { newId } from "@/lib/ids";
import type { MetaUserData } from "@/lib/meta/capi";

// Atribución publicitaria persistida. El problema que resuelve: la venta real
// ocurre en el webhook de `invoice.paid`, catorce días después del checkout y
// sin navegador delante. Ahí no existen `_fbp` ni `_fbc`, que son justo las
// cookies que permiten a Meta saber qué anuncio trajo a esa persona. Sin
// ellas la conversión llega sin atribuir, que para optimizar es casi como no
// llegar.
//
// Se guarda sobre la tabla `events`, que ya es el audit trail del producto:
// ni tabla ni migración nuevas.

const TIPO = "meta_attrib";
const TIPO_PURCHASE = "meta_purchase_sent";

export type Atribucion = Pick<
  MetaUserData,
  "fbp" | "fbc" | "clientIp" | "clientUserAgent"
>;

function tieneAlgo(datos: Atribucion) {
  return Boolean(datos.fbp || datos.fbc);
}

// Atribución sacada de una request cruda, para los sitios donde no hay
// `cookies()` de Next: hooks de Better-Auth, por ejemplo. Puede venir vacía si
// el usuario abre el enlace del correo en otro dispositivo — de ahí que
// siempre se combine con la versión guardada en base de datos.
export function atribucionDeRequest(request?: Request): Atribucion {
  if (!request) return {};
  const cookie = request.headers.get("cookie") ?? "";
  const leer = (nombre: string) => {
    const encontrada = cookie
      .split("; ")
      .find((trozo) => trozo.startsWith(`${nombre}=`));
    return encontrada ? encontrada.slice(nombre.length + 1) : null;
  };
  return {
    fbp: leer("_fbp"),
    fbc: leer("_fbc"),
    clientIp:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    clientUserAgent: request.headers.get("user-agent"),
  };
}

export async function guardarAtribucion(userId: string, datos: Atribucion) {
  // Sin cookies de Meta no hay nada que guardar: escribir una fila vacía solo
  // taparía la última atribución buena con ruido.
  if (!tieneAlgo(datos)) return;
  try {
    await db.insert(events).values({
      id: newId("evt"),
      userId,
      type: TIPO,
      payload: datos,
    });
  } catch (err) {
    console.error("[meta-attrib] no se pudo guardar la atribución:", err);
  }
}

export async function leerAtribucion(userId: string): Promise<Atribucion> {
  try {
    const [fila] = await db
      .select({ payload: events.payload })
      .from(events)
      .where(and(eq(events.userId, userId), eq(events.type, TIPO)))
      .orderBy(desc(events.createdAt))
      .limit(1);
    return (fila?.payload as Atribucion | null) ?? {};
  } catch (err) {
    console.error("[meta-attrib] no se pudo leer la atribución:", err);
    return {};
  }
}

// `invoice.paid` se dispara en CADA renovación mensual y con un invoice.id
// distinto, así que la deduplicación de Meta no lo frena: sin esta guarda se
// reportaría una venta nueva cada mes y el ROAS sería ficción. Devuelve true
// solo la primera vez que se llama para una suscripción dada.
export async function marcarPurchaseEnviado(
  userId: string,
  subscriptionId: string,
): Promise<boolean> {
  try {
    const [previo] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.userId, userId), eq(events.type, TIPO_PURCHASE)))
      .limit(1);
    if (previo) return false;

    await db.insert(events).values({
      id: newId("evt"),
      userId,
      type: TIPO_PURCHASE,
      payload: { subscriptionId },
    });
    return true;
  } catch (err) {
    // Ante la duda, no enviar: un Purchase de menos es un dato incompleto,
    // uno de más corrompe la optimización de las campañas.
    console.error("[meta-attrib] no se pudo marcar el Purchase:", err);
    return false;
  }
}

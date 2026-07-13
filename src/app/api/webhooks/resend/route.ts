import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { newId } from "@/lib/ids";

// Eventos del ciclo de vida que nos interesan, mapeados a nuestros tipos.
// El resto (email.sent, email.clicked, delivery_delayed…) se aceptan y se
// ignoran: responder 2xx evita reintentos de Resend por eventos que no usamos.
const EVENT_MAP: Record<string, string> = {
  "email.delivered": "email_delivered",
  "email.opened": "email_opened",
  "email.bounced": "email_bounced",
  "email.complained": "email_complained",
};

// Firma svix (la usa Resend): HMAC-SHA256 en base64 sobre "id.timestamp.body"
// con el secreto whsec_ decodificado. La cabecera puede traer varias firmas
// ("v1,xxx v1,yyy") tras una rotación de secreto.
function verifySignature(
  secret: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  body: string,
): boolean {
  const skewSeconds = Math.abs(Date.now() / 1000 - Number(svixTimestamp));
  if (!Number.isFinite(skewSeconds) || skewSeconds > 300) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${svixId}.${svixTimestamp}.${body}`)
    .digest();

  return svixSignature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    // Sin secreto no se puede verificar nada: rechazar (svix reintenta).
    return new Response("webhook secret not configured", { status: 503 });
  }

  const body = await req.text();
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  if (
    !svixId ||
    !svixTimestamp ||
    !svixSignature ||
    !verifySignature(secret, svixId, svixTimestamp, svixSignature, body)
  ) {
    return new Response("invalid signature", { status: 401 });
  }

  let payload: { type?: string; data?: { email_id?: string; to?: string[] } };
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("invalid body", { status: 400 });
  }

  const type = EVENT_MAP[payload.type ?? ""];
  const emailId = payload.data?.email_id;
  if (!type || !emailId) return new Response("ignored", { status: 200 });

  // Solo los recordatorios se rastrean: el email_id de Resend quedó guardado
  // como payload.messageId del evento reminder_sent. Correos de verificación,
  // soporte, etc. no casan y se ignoran.
  const [sentEvent] = await db
    .select({
      userId: events.userId,
      invoiceId: events.invoiceId,
      reminderId: events.reminderId,
    })
    .from(events)
    .where(
      and(
        eq(events.type, "reminder_sent"),
        sql`${events.payload}->>'messageId' = ${emailId}`,
      ),
    )
    .limit(1);
  if (!sentEvent) return new Response("ignored", { status: 200 });

  // Idempotencia: svix reintenta y "opened" puede dispararse muchas veces.
  // Solo se registra la primera ocurrencia de cada tipo por recordatorio.
  const [existing] = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.type, type),
        sql`${events.payload}->>'emailId' = ${emailId}`,
      ),
    )
    .limit(1);
  if (existing) return new Response("already recorded", { status: 200 });

  await db.insert(events).values({
    id: newId("evt"),
    userId: sentEvent.userId,
    type,
    invoiceId: sentEvent.invoiceId,
    reminderId: sentEvent.reminderId,
    payload: { emailId, to: payload.data?.to },
  });

  return new Response("ok", { status: 200 });
}

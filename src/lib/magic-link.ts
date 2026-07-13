import { createHmac, timingSafeEqual } from "node:crypto";

// Enlace firmado "marcar pagada" del resumen semanal: capacidad única (esa
// factura, ese usuario) sin sesión. Stateless: HMAC con BETTER_AUTH_SECRET,
// caduca solo (cada resumen re-emite enlaces frescos, no hace falta revocar).

const VERSION = 1;
const DEFAULT_TTL_DAYS = 35;

export type MarkPaidPayload = {
  invoiceId: string;
  userId: string;
};

function secretKey(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET no configurado");
  return Buffer.from(secret, "utf8");
}

function b64url(data: Buffer | string): string {
  return Buffer.from(data).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", secretKey()).update(payload).digest("base64url");
}

export function createMarkPaidToken(
  { invoiceId, userId }: MarkPaidPayload,
  now: number,
  ttlDays = DEFAULT_TTL_DAYS,
): string {
  const exp = Math.floor(now / 1000) + ttlDays * 24 * 60 * 60;
  const payload = b64url(JSON.stringify({ v: VERSION, invoiceId, userId, exp }));
  return `${payload}.${sign(payload)}`;
}

export function verifyMarkPaidToken(
  token: string,
  now: number,
): MarkPaidPayload | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expected = Buffer.from(sign(payload), "utf8");
  const given = Buffer.from(sig, "utf8");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      data.v !== VERSION ||
      typeof data.invoiceId !== "string" ||
      typeof data.userId !== "string" ||
      typeof data.exp !== "number" ||
      data.exp * 1000 < now
    ) {
      return null;
    }
    return { invoiceId: data.invoiceId, userId: data.userId };
  } catch {
    return null;
  }
}

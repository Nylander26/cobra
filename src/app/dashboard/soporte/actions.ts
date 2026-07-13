"use server";

import { getTransport } from "@/lib/email/transport";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireSession } from "@/lib/session";

const TYPES = {
  sugerencia: "Sugerencia",
  problema: "Problema",
  pregunta: "Pregunta",
} as const;

// Remitente: identidad del dominio verificado (no es secreto). Destino: bandeja
// interna, en env para no fijar un correo personal en el código.
const SUPPORT_FROM =
  process.env.SUPPORT_FROM ?? "Cobra Soporte <soporte@micobra.es>";

export type SupportState = { ok?: boolean; error?: string };

export async function sendSupportMessage(
  _prev: SupportState,
  formData: FormData,
): Promise<SupportState> {
  const { user } = await requireSession();

  const type = TYPES[String(formData.get("type") ?? "") as keyof typeof TYPES];
  const message = String(formData.get("message") ?? "").trim();

  if (!type) return { error: "Elige un tipo de mensaje." };
  if (message.length < 10)
    return { error: "Cuéntanos un poco más (mínimo 10 caracteres)." };
  if (message.length > 5000)
    return { error: "El mensaje es demasiado largo (máx. 5000 caracteres)." };

  const inbox = process.env.SUPPORT_INBOX;
  if (!inbox) {
    return {
      error: "El soporte no está configurado todavía. Inténtalo más tarde.",
    };
  }

  // Cada mensaje dispara un email: 5 por hora y usuario.
  if (!(await checkRateLimit(`support:${user.id}`, { max: 5, windowSeconds: 3600 }))) {
    return {
      error:
        "Has enviado varios mensajes seguidos. Espera un rato antes de escribir de nuevo; los anteriores ya nos han llegado.",
    };
  }

  const text = [
    `Tipo: ${type}`,
    `De: ${user.name} <${user.email}>`,
    `Usuario: ${user.id}`,
    "",
    message,
  ].join("\n");

  try {
    await getTransport().send({
      to: inbox,
      from: SUPPORT_FROM,
      // Responder al email va directo al usuario que escribió.
      replyTo: user.email,
      subject: `[Cobra soporte] ${type} — ${user.name}`,
      text,
    });
  } catch {
    return { error: "No se pudo enviar. Inténtalo de nuevo en un momento." };
  }

  return { ok: true };
}

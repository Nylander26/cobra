"use server";

import { headers } from "next/headers";
import { buildContactEmail } from "@/lib/email/internal";
import { getTransport } from "@/lib/email/transport";
import { checkRateLimit } from "@/lib/rate-limit";

const SUPPORT_FROM =
  process.env.SUPPORT_FROM ?? "Cobra Soporte <soporte@micobra.es>";

// Deliberadamente laxo: solo descarta lo que no puede ser un correo. Validar
// de más aquí rechaza direcciones válidas y pierde la consulta.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type ContactoState = { ok?: boolean; error?: string };

export async function enviarConsulta(
  _prev: ContactoState,
  formData: FormData,
): Promise<ContactoState> {
  // Trampa para bots: el campo va oculto por CSS y ninguna persona lo ve. Si
  // viene relleno se responde ok sin enviar nada, para no enseñarle al bot
  // qué le ha delatado.
  if (String(formData.get("empresa") ?? "").trim() !== "") return { ok: true };

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const message = String(formData.get("message") ?? "").trim();
  const page = String(formData.get("page") ?? "/").slice(0, 200);

  if (!EMAIL.test(email)) return { error: "Revisa tu correo electrónico." };
  if (message.length < 10)
    return { error: "Cuéntanos un poco más (mínimo 10 caracteres)." };
  if (message.length > 3000)
    return { error: "El mensaje es demasiado largo (máx. 3000 caracteres)." };

  const inbox = process.env.SUPPORT_INBOX;
  if (!inbox) {
    return { error: "El contacto no está disponible ahora mismo." };
  }

  // Este formulario es público: el límite va por IP, que es lo único que no
  // controla quien escribe. 3 por hora deja escribir y corregirse, y corta el
  // envío automatizado.
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";
  if (!(await checkRateLimit(`contacto:${ip}`, { max: 3, windowSeconds: 3600 }))) {
    return {
      error:
        "Has enviado varios mensajes seguidos. Espera un rato; los anteriores ya nos han llegado.",
    };
  }

  const built = buildContactEmail({ email, message, page });

  try {
    await getTransport().send({
      to: inbox,
      from: SUPPORT_FROM,
      // Responder al aviso escribe directamente a quien preguntó.
      replyTo: email,
      subject: built.subject,
      text: built.text,
      html: built.html,
    });
  } catch {
    return { error: "No se pudo enviar. Inténtalo de nuevo en un momento." };
  }

  return { ok: true };
}

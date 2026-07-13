import { getTransport } from "@/lib/email/transport";

// Aviso interno al owner (SUPPORT_INBOX) cuando el envío falla o algo huele a
// abuso. Texto plano a propósito: es operativo, no producto. Nunca lanza — un
// fallo del aviso no debe tumbar el cron que lo emite (los eventos quedan en
// la BD de todas formas).
export async function sendOpsAlert(
  subject: string,
  lines: string[],
): Promise<void> {
  const owner = process.env.SUPPORT_INBOX;
  if (!owner) return;
  try {
    await getTransport().send({
      to: owner,
      from: "Cobra Ops <soporte@micobra.es>",
      subject: `[Cobra ops] ${subject}`,
      text: `${lines.join("\n")}\n\nEventos completos en la tabla events (reminder_failed / reminder_capped).\n`,
    });
  } catch {
    // Sin transporte no hay aviso; no interrumpir el cron por esto.
  }
}

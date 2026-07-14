import { buildOpsAlertEmail } from "@/lib/email/internal";
import { getTransport } from "@/lib/email/transport";

// Aviso interno al owner (SUPPORT_INBOX) cuando el envío falla o algo huele a
// abuso. HTML con la plantilla de Cobra (todo lo que sale por correo va
// formateado); el texto plano acompaña siempre. Nunca lanza — un fallo del
// aviso no debe tumbar el cron que lo emite (los eventos quedan en la BD de
// todas formas).
export async function sendOpsAlert(
  subject: string,
  lines: string[],
): Promise<void> {
  const owner = process.env.SUPPORT_INBOX;
  if (!owner) return;
  try {
    const email = buildOpsAlertEmail(subject, lines);
    await getTransport().send({
      to: owner,
      from: "Cobra Ops <soporte@micobra.es>",
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
  } catch {
    // Sin transporte no hay aviso; no interrumpir el cron por esto.
  }
}

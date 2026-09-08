"use server";

import { headers } from "next/headers";
import { buildCalculoEmail } from "@/lib/email/calculadora";
import { getTransport } from "@/lib/email/transport";
import { computeLateInterest } from "@/lib/late-interest";
import { registrarLead } from "@/lib/leads";
import { atribucionDeHeaders } from "@/lib/meta/attrib";
import { parseAmountToCents } from "@/lib/money";
import { checkRateLimit } from "@/lib/rate-limit";

const FROM = "Cobra <soporte@micobra.es>";
const APP_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

// El destino del correo lleva su propia campaña: así el alta que venga de aquí
// se distingue en la base de datos de la que viene directa del anuncio, y se
// puede saber si la herramienta convierte o solo entretiene.
const CTA_URL = `${APP_URL}/signup?utm_source=calculadora&utm_medium=email&utm_campaign=calculo-demora`;

// Deliberadamente laxo, igual que en el formulario de contacto: solo descarta
// lo que no puede ser un correo. Validar de más aquí pierde leads reales.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type CalculoState = { ok?: boolean; error?: string };

export async function enviarCalculo(
  _prev: CalculoState,
  formData: FormData,
): Promise<CalculoState> {
  // Trampa para bots: campo oculto por CSS que ninguna persona ve. Se responde
  // ok sin hacer nada, para no enseñarle al bot qué le ha delatado.
  if (String(formData.get("empresa") ?? "").trim() !== "") return { ok: true };

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!EMAIL.test(email)) return { error: "Revisa tu correo electrónico." };

  const amountCents = parseAmountToCents(String(formData.get("importe") ?? ""));
  const dueRaw = String(formData.get("vencimiento") ?? "");
  const dueDate = new Date(`${dueRaw}T00:00:00Z`);
  if (!amountCents || amountCents <= 0 || Number.isNaN(dueDate.getTime())) {
    return { error: "Vuelve a calcular el importe antes de enviarlo." };
  }

  // Formulario público: el límite va por IP, lo único que no controla quien
  // escribe. 5 por hora deja corregir una errata en el correo y corta el envío
  // automatizado, que aquí además cuesta dinero (un email por intento).
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";
  if (!(await checkRateLimit(`calculo:${ip}`, { max: 5, windowSeconds: 3600 }))) {
    return {
      error: "Has pedido varios cálculos seguidos. Espera un rato y vuelve a intentarlo.",
    };
  }

  // El cálculo se rehace en el servidor: lo que llega del formulario son los
  // datos de entrada, no el resultado. Nadie manda por correo una cifra que
  // haya escrito el navegador.
  const result = computeLateInterest(amountCents, dueDate, new Date());

  const { campana } = atribucionDeHeaders(h);

  try {
    await registrarLead({
      email,
      source: "calculadora",
      amountCents,
      claimableCents: result.totalCents,
      dueDate,
      campana,
    });
  } catch (err) {
    // El correo prometido pesa más que la fila: si la base de datos falla, se
    // envía igual y el lead se pierde. Al revés sería romper la promesa.
    console.error("[calculadora] no se pudo guardar el lead:", err);
  }

  const built = buildCalculoEmail({ amountCents, dueDate, result, ctaUrl: CTA_URL });

  try {
    await getTransport().send({
      to: email,
      from: FROM,
      subject: built.subject,
      text: built.text,
      html: built.html,
    });
  } catch (err) {
    console.error("[calculadora] no se pudo enviar el cálculo:", err);
    return { error: "No hemos podido enviarlo. Inténtalo de nuevo en un momento." };
  }

  return { ok: true };
}

// Plantillas de la carta de reclamación pública. Mismo tono y escalado que la
// secuencia por defecto de la app (src/lib/default-sequence.ts), adaptadas a
// envío manual: aquí las variables se interpolan al generar, no al enviar.
// Módulo puro: sin fechas ni aleatoriedad en scope de módulo.

export type LetterTone = "friendly" | "neutral" | "firm" | "final";

export type LetterInput = {
  contacto: string;
  numero: string;
  importe: string; // ya formateado: "1.250,50 €"
  vencimiento: string; // ya formateado: "17/07/2026"
  diasRetraso: number;
  interes: string | null; // interés devengado formateado; solo tono final
  remitente: string;
};

export type Letter = { subject: string; body: string };

export const TONE_ORDER: LetterTone[] = [
  "friendly",
  "neutral",
  "firm",
  "final",
];

export const TONE_META: Record<
  LetterTone,
  { label: string; cuando: string }
> = {
  friendly: { label: "Amable", cuando: "Aún no ha vencido" },
  neutral: { label: "Neutro", cuando: "Vence hoy" },
  firm: { label: "Firme", cuando: "Vencida hace días" },
  final: { label: "Última notificación", cuando: "Con intereses (Ley 3/2004)" },
};

const dias = (n: number) => (n === 1 ? "1 día" : `${n} días`);

export function buildLetter(tone: LetterTone, v: LetterInput): Letter {
  switch (tone) {
    case "friendly":
      return {
        subject: `Recordatorio: la factura ${v.numero} vence el ${v.vencimiento}`,
        body: `Hola ${v.contacto},

Te escribo para recordarte que la factura ${v.numero}, por importe de ${v.importe}, vence el ${v.vencimiento}.

Si ya la tienes programada, ignora este mensaje. Si necesitas que te reenvíe la factura o cualquier dato para el pago, dímelo y te lo hago llegar enseguida.

Un saludo,
${v.remitente}`,
      };
    case "neutral":
      return {
        subject: `La factura ${v.numero} vence hoy`,
        body: `Hola ${v.contacto},

La factura ${v.numero}, por importe de ${v.importe}, vence hoy ${v.vencimiento}.

Te agradezco que confirmes el pago o me indiques una fecha prevista. Cualquier cosa que necesites de mi parte, aquí estoy.

Un saludo,
${v.remitente}`,
      };
    case "firm":
      return {
        subject: `Factura ${v.numero} vencida (${dias(v.diasRetraso)})`,
        body: `Hola ${v.contacto},

La factura ${v.numero}, por importe de ${v.importe}, venció el ${v.vencimiento} y consta como pendiente de pago (${dias(v.diasRetraso)} de retraso).

Te agradecería que regularices el pago esta semana o me indiques cuándo puedo esperarlo. Si hay alguna incidencia con la factura, dímelo y lo resolvemos.

Un saludo,
${v.remitente}`,
      };
    case "final": {
      const interesFrase = v.interes
        ? `las facturas impagadas entre empresas devengan intereses de demora desde el día siguiente al vencimiento —en el caso de esta factura, ${v.interes} a día de hoy— además de una compensación fija de 40 € por costes de cobro`
        : `las facturas impagadas entre empresas devengan intereses de demora desde el día siguiente al vencimiento, además de una compensación fija de 40 € por costes de cobro`;
      return {
        subject: `Última notificación — factura ${v.numero} vencida`,
        body: `Hola ${v.contacto},

La factura ${v.numero}, por importe de ${v.importe}, sigue pendiente de pago ${dias(v.diasRetraso)} después de su vencimiento (${v.vencimiento}), a pesar de los recordatorios anteriores.

Te pido que procedas al pago en los próximos días. Conforme a la Ley 3/2004 de lucha contra la morosidad en las operaciones comerciales, ${interesFrase}.

Prefiero resolver esto de forma amistosa; te agradezco que te pongas en contacto conmigo para cerrarlo.

Un saludo,
${v.remitente}`,
      };
    }
  }
}

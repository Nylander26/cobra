import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { sequences, sequenceSteps } from "@/db/schema";
import { newId } from "@/lib/ids";

// The default reminder sequence. Copy is Spanish-professional and editable per
// user later — templates use {{variables}} interpolated at send time (week 2):
//   {{cliente}} {{numero}} {{importe}} {{vencimiento}} {{dias_retraso}}
//   {{remitente}} {{firma}}
export const DEFAULT_STEPS = [
  {
    offsetDays: -3,
    tone: "friendly" as const,
    subject: "Recordatorio: la factura {{numero}} vence el {{vencimiento}}",
    body: `Hola {{cliente}},

Te escribo para recordarte que la factura {{numero}}, por importe de {{importe}}, vence el {{vencimiento}}.

Si ya la tienes programada, ignora este mensaje. Si necesitas que te reenvíe la factura o cualquier dato para el pago, dímelo y te lo hago llegar enseguida.

Un saludo,
{{remitente}}
{{firma}}`,
  },
  {
    offsetDays: 0,
    tone: "neutral" as const,
    subject: "La factura {{numero}} vence hoy",
    body: `Hola {{cliente}},

La factura {{numero}}, por importe de {{importe}}, vence hoy {{vencimiento}}.

Te agradezco que confirmes el pago o me indiques una fecha prevista. Cualquier cosa que necesites de mi parte, aquí estoy.

Un saludo,
{{remitente}}
{{firma}}`,
  },
  {
    offsetDays: 7,
    tone: "firm" as const,
    subject: "Factura {{numero}} vencida ({{dias_retraso}} días)",
    body: `Hola {{cliente}},

La factura {{numero}}, por importe de {{importe}}, venció el {{vencimiento}} y consta como pendiente de pago ({{dias_retraso}} días de retraso).

Te agradecería que regularices el pago esta semana o me indiques cuándo puedo esperarlo. Si hay alguna incidencia con la factura, dímelo y lo resolvemos.

Un saludo,
{{remitente}}
{{firma}}`,
  },
  {
    offsetDays: 15,
    tone: "final" as const,
    subject: "Última notificación — factura {{numero}} vencida",
    body: `Hola {{cliente}},

La factura {{numero}}, por importe de {{importe}}, sigue pendiente de pago {{dias_retraso}} días después de su vencimiento ({{vencimiento}}), a pesar de los recordatorios anteriores.

Te pido que procedas al pago en los próximos días. Conforme a la Ley 3/2004 de lucha contra la morosidad en las operaciones comerciales, las facturas impagadas entre empresas devengan intereses de demora desde la fecha de vencimiento, además de una compensación por costes de cobro.

Prefiero resolver esto de forma amistosa; te agradezco que te pongas en contacto conmigo para cerrarlo.

Un saludo,
{{remitente}}
{{firma}}`,
  },
];

export type DefaultStep = { id: string; offsetDays: number };

// Returns the user's default sequence steps, creating the sequence + steps on
// first use. No transaction (neon-http): a concurrent first-invoice race could
// duplicate the default sequence — acceptable for MVP, rare in practice.
export async function getOrCreateDefaultSequenceSteps(
  userId: string,
): Promise<DefaultStep[]> {
  const existing = await db
    .select({ id: sequences.id })
    .from(sequences)
    .where(and(eq(sequences.userId, userId), eq(sequences.isDefault, true)))
    .limit(1);

  if (existing.length > 0) {
    return db
      .select({ id: sequenceSteps.id, offsetDays: sequenceSteps.offsetDays })
      .from(sequenceSteps)
      .where(eq(sequenceSteps.sequenceId, existing[0].id))
      .orderBy(asc(sequenceSteps.offsetDays));
  }

  const sequenceId = newId("seq");
  await db.insert(sequences).values({
    id: sequenceId,
    userId,
    name: "Secuencia por defecto",
    isDefault: true,
  });

  const stepRows = DEFAULT_STEPS.map((step) => ({
    id: newId("stp"),
    sequenceId,
    offsetDays: step.offsetDays,
    subject: step.subject,
    body: step.body,
    tone: step.tone,
  }));
  await db.insert(sequenceSteps).values(stepRows);

  return stepRows.map((s) => ({ id: s.id, offsetDays: s.offsetDays }));
}

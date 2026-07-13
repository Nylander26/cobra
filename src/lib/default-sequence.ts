import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { sequences, sequenceSteps } from "@/db/schema";
import { newId } from "@/lib/ids";

export type ReminderTone = "friendly" | "neutral" | "firm" | "final";

export type SequenceStep = {
  id: string;
  offsetDays: number;
  subject: string;
  body: string;
  tone: ReminderTone;
};

// Un paso entrante desde el editor: sin id = paso nuevo (se inserta).
export type StepInput = {
  id?: string;
  offsetDays: number;
  subject: string;
  body: string;
  tone: ReminderTone;
};

// The default reminder sequence. Copy is Spanish-professional and editable per
// user — templates use {{variables}} interpolated at send time:
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

// The user's single sequence (isDefault=true), created on first use with the
// default steps. Returns the full steps so the editor can render them. No
// transaction (neon-http): a concurrent first-use race could duplicate the
// sequence — acceptable for MVP, rare in practice.
export async function getOrCreateUserSequence(
  userId: string,
): Promise<{ id: string; steps: SequenceStep[] }> {
  const existing = await db
    .select({ id: sequences.id })
    .from(sequences)
    .where(and(eq(sequences.userId, userId), eq(sequences.isDefault, true)))
    .limit(1);

  if (existing.length > 0) {
    const steps = await db
      .select({
        id: sequenceSteps.id,
        offsetDays: sequenceSteps.offsetDays,
        subject: sequenceSteps.subject,
        body: sequenceSteps.body,
        tone: sequenceSteps.tone,
      })
      .from(sequenceSteps)
      .where(eq(sequenceSteps.sequenceId, existing[0].id))
      .orderBy(asc(sequenceSteps.offsetDays));
    return { id: existing[0].id, steps };
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

  return {
    id: sequenceId,
    steps: stepRows.map((s) => ({
      id: s.id,
      offsetDays: s.offsetDays,
      subject: s.subject,
      body: s.body,
      tone: s.tone,
    })),
  };
}

// Returns the user's default sequence steps (id + offset only), creating the
// sequence on first use. Used by invoice creation to materialize reminders.
export async function getOrCreateDefaultSequenceSteps(
  userId: string,
): Promise<DefaultStep[]> {
  const seq = await getOrCreateUserSequence(userId);
  return seq.steps.map((s) => ({ id: s.id, offsetDays: s.offsetDays }));
}

// Aplica el estado del editor a la secuencia del usuario mediante un diff:
// - pasos con id existente -> UPDATE (conservan sus recordatorios pendientes;
//   el texto se propaga porque el envío hace join en vivo; cambiar los días
//   NO reprograma recordatorios ya materializados, solo afecta a facturas nuevas).
// - pasos sin id -> INSERT.
// - pasos existentes que ya no vienen -> DELETE (el cascade retira sus
//   recordatorios pendientes: quitar un paso deja de enviar ese recordatorio).
// Devuelve el estado final (con ids) para que el cliente sincronice.
export async function saveUserSequenceSteps(
  userId: string,
  input: StepInput[],
): Promise<SequenceStep[]> {
  const seq = await getOrCreateUserSequence(userId);
  const existingIds = new Set(seq.steps.map((s) => s.id));
  const keepIds = new Set<string>();

  for (const step of input) {
    if (step.id && existingIds.has(step.id)) {
      keepIds.add(step.id);
      await db
        .update(sequenceSteps)
        .set({
          offsetDays: step.offsetDays,
          subject: step.subject,
          body: step.body,
          tone: step.tone,
        })
        .where(
          and(
            eq(sequenceSteps.id, step.id),
            eq(sequenceSteps.sequenceId, seq.id),
          ),
        );
    } else {
      await db.insert(sequenceSteps).values({
        id: newId("stp"),
        sequenceId: seq.id,
        offsetDays: step.offsetDays,
        subject: step.subject,
        body: step.body,
        tone: step.tone,
      });
    }
  }

  const toDelete = seq.steps
    .filter((s) => !keepIds.has(s.id))
    .map((s) => s.id);
  if (toDelete.length > 0) {
    await db.delete(sequenceSteps).where(inArray(sequenceSteps.id, toDelete));
  }

  await db
    .update(sequences)
    .set({ updatedAt: new Date() })
    .where(eq(sequences.id, seq.id));

  const refreshed = await getOrCreateUserSequence(userId);
  return refreshed.steps;
}

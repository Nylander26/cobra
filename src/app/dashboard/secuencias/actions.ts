"use server";

import { revalidatePath } from "next/cache";
import {
  type ReminderTone,
  saveUserSequenceSteps,
  type SequenceStep,
  type StepInput,
} from "@/lib/default-sequence";
import { userHasFeature } from "@/lib/features";
import { requireSession } from "@/lib/session";

const TONES: ReminderTone[] = ["friendly", "neutral", "firm", "final"];
const MAX_STEPS = 8;

export type SequenceState = {
  ok?: boolean;
  error?: string;
  steps?: SequenceStep[];
};

export async function saveSequence(
  _prev: SequenceState,
  formData: FormData,
): Promise<SequenceState> {
  const { user } = await requireSession();

  // Gate de servidor: la UI ya oculta el editor a Free, esto es la barrera real.
  if (!(await userHasFeature(user.id, "custom_sequences"))) {
    return {
      error:
        "Las secuencias personalizadas están disponibles en el plan Autónomo.",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(String(formData.get("steps") ?? "[]"));
  } catch {
    return { error: "No se pudieron leer los pasos." };
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { error: "La secuencia necesita al menos un paso." };
  }
  if (parsed.length > MAX_STEPS) {
    return { error: `Una secuencia puede tener como máximo ${MAX_STEPS} pasos.` };
  }

  const steps: StepInput[] = [];
  for (const raw of parsed) {
    const r = raw as Record<string, unknown>;
    const offsetDays = Math.trunc(Number(r.offsetDays));
    const subject = String(r.subject ?? "").trim();
    const body = String(r.body ?? "").trim();
    const tone = String(r.tone ?? "") as ReminderTone;

    if (!Number.isFinite(offsetDays) || offsetDays < -30 || offsetDays > 365) {
      return {
        error: "Los días de cada paso deben estar entre -30 y 365.",
      };
    }
    if (subject.length < 1 || subject.length > 200) {
      return { error: "Cada asunto debe tener entre 1 y 200 caracteres." };
    }
    if (body.length < 1 || body.length > 5000) {
      return { error: "Cada mensaje debe tener entre 1 y 5000 caracteres." };
    }
    if (!TONES.includes(tone)) {
      return { error: "Tono no válido." };
    }

    const id = typeof r.id === "string" && r.id ? r.id : undefined;
    steps.push({ id, offsetDays, subject, body, tone });
  }

  // Orden estable por día para la materialización de recordatorios.
  steps.sort((a, b) => a.offsetDays - b.offsetDays);

  const saved = await saveUserSequenceSteps(user.id, steps);

  revalidatePath("/dashboard/secuencias");
  revalidatePath("/dashboard/invoices");
  return { ok: true, steps: saved };
}

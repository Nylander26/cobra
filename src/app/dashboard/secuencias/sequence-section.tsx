import { FeatureLock } from "@/components/feature-lock";
import { getUserPlan } from "@/lib/billing";
import { getOrCreateDefaultBrand, getUserBrands } from "@/lib/brands";
import {
  DEFAULT_STEPS,
  getOrCreateUserSequence,
  type ReminderTone,
} from "@/lib/default-sequence";
import { planHas } from "@/lib/plans";
import { fromEmail } from "@/lib/reminders/send";
import { requireSession } from "@/lib/session";
import { SequenceEditor } from "./sequence-editor";
import type { EmailPreviewData } from "./step-preview";

const TONE_LABEL: Record<ReminderTone, string> = {
  friendly: "Amistoso",
  neutral: "Neutral",
  firm: "Firme",
  final: "Final",
};

function offsetLabel(n: number): string {
  const abs = Math.abs(n);
  const unit = abs === 1 ? "día" : "días";
  if (n < 0) return `${abs} ${unit} antes del vencimiento`;
  if (n === 0) return "El día del vencimiento";
  return `${n} ${unit} después del vencimiento`;
}

// Dynamic: reads session + plan. Rendered in <Suspense>.
export async function SequenceSection() {
  const { user } = await requireSession();
  const plan = await getUserPlan(user.id);

  if (planHas(plan, "custom_sequences")) {
    const seq = await getOrCreateUserSequence(user.id);

    // Vista previa (email_preview: Autónomo y Estudio): se previsualiza con
    // las marcas reales del usuario, replicando la resolución de remitente
    // del envío (send.ts): senderName || nombre de marca, replyTo || email.
    let preview: EmailPreviewData | null = null;
    if (planHas(plan, "email_preview")) {
      let userBrands = await getUserBrands(user.id);
      if (userBrands.length === 0) {
        userBrands = [await getOrCreateDefaultBrand(user.id, user.name)];
      }
      preview = {
        fromAddress: fromEmail(),
        brands: userBrands.map((b) => ({
          id: b.id,
          name: b.name,
          fromName: b.senderName || b.name,
          replyTo: b.replyTo || user.email,
          signature: b.signature,
          logoUrl: b.logoUrl ? `/api/brands/${b.id}/logo` : null,
          htmlEmails: b.htmlEmails,
        })),
      };
    }

    return <SequenceEditor initialSteps={seq.steps} preview={preview} />;
  }

  // Free: vista de solo lectura de la secuencia por defecto + upsell. No se
  // escribe en la BD (no se crea la secuencia hasta que haga falta enviar).
  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-500">
        Esta es la secuencia que Cobra envía por ti. Para adaptarla a tu tono y
        tus plazos, mejora a Autónomo.
      </p>
      <ol className="space-y-3">
        {DEFAULT_STEPS.map((step, i) => (
          <li
            key={i}
            className="rounded-xl border border-neutral-200 bg-white p-4 opacity-90 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-100 font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                {i + 1}
              </span>
              <span>{offsetLabel(step.offsetDays)}</span>
              <span aria-hidden>·</span>
              <span>{TONE_LABEL[step.tone]}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
              {step.subject}
            </p>
            <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-neutral-500">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
      <FeatureLock feature="custom_sequences" />
    </div>
  );
}

export function SequenceSectionFallback() {
  return (
    <div className="space-y-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-900"
        />
      ))}
    </div>
  );
}

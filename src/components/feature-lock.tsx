import Link from "next/link";
import { IconLock } from "@/components/icons";
import { FEATURES, minPlanFor, type PlanFeature, PLANS } from "@/lib/plans";

// Bloqueo + upsell para una funcionalidad premium. Presentacional: no consulta
// el plan (eso lo decide quien lo renderiza con planHas/userHasFeature). Muestra
// candado, a qué plan pertenece la feature y CTA a Facturación.
export function FeatureLock({
  feature,
  className,
}: {
  feature: PlanFeature;
  className?: string;
}) {
  const minPlan = minPlanFor(feature);
  const planName = minPlan ? PLANS[minPlan].name : "un plan superior";
  const label = FEATURES[feature].label;

  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center dark:border-neutral-700 dark:bg-neutral-900 ${className ?? ""}`}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        <IconLock className="h-5 w-5" />
      </span>
      <div className="space-y-1">
        <p className="font-semibold text-neutral-900 dark:text-neutral-50">
          {label}
        </p>
        <p className="text-sm text-neutral-500">
          Disponible en el plan {planName}.
        </p>
      </div>
      <Link
        href="/dashboard/billing"
        className="rounded-lg bg-cobra px-4 py-2 text-sm font-medium text-white transition hover:bg-cobra-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra"
      >
        Mejorar a {planName}
      </Link>
    </div>
  );
}

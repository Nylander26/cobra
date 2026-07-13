import { getPlanUsage } from "@/lib/billing";
import { formatCents } from "@/lib/money";
import { PLAN_ORDER, PLANS } from "@/lib/plans";
import { requireSession } from "@/lib/session";
import { CheckoutButton } from "./checkout-button";

// Dynamic: reads session + the user's plan/usage. Rendered in <Suspense>.
export async function BillingPanel() {
  const { user } = await requireSession();
  const usage = await getPlanUsage(user.id);
  const current = PLANS[usage.plan];

  const limitLabel =
    usage.limit === null ? "ilimitadas" : `${usage.active} de ${usage.limit}`;
  const pct =
    usage.limit === null
      ? 0
      : Math.min(100, Math.round((usage.active / usage.limit) * 100));

  return (
    <div className="animate-rise space-y-8">
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-sm text-neutral-500">Tu plan</p>
            <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
              {current.name}
            </p>
          </div>
          <p className="text-sm text-neutral-500">
            Facturas activas: {limitLabel}
          </p>
        </div>
        {usage.limit !== null && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className={`h-full rounded-full ${usage.canAdd ? "bg-neutral-900 dark:bg-neutral-50" : "bg-red-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        {!usage.canAdd && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            Has alcanzado el límite. Marca facturas como pagadas o mejora de
            plan para seguir añadiendo.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const isCurrent = id === usage.plan;
          return (
            <div
              key={id}
              className={`rounded-xl border p-5 ${
                isCurrent
                  ? "border-neutral-900 dark:border-neutral-50"
                  : "border-neutral-200 dark:border-neutral-800"
              } bg-white dark:bg-neutral-900`}
            >
              <p className="font-semibold text-neutral-900 dark:text-neutral-50">
                {p.name}
              </p>
              <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                {p.priceCents === 0 ? "Gratis" : formatCents(p.priceCents)}
                {p.priceCents > 0 && (
                  <span className="text-sm font-normal text-neutral-500">
                    /mes
                  </span>
                )}
              </p>
              <ul className="mt-3 space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
                {p.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              {isCurrent ? (
                <button
                  type="button"
                  disabled
                  className="mt-4 w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-500 disabled:opacity-60 dark:border-neutral-700"
                >
                  Plan actual
                </button>
              ) : p.priceCents > 0 ? (
                <CheckoutButton plan={id} label={`Empezar con ${p.name}`} />
              ) : (
                <div className="mt-4 h-[38px]" />
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-neutral-400">
        Incluye 14 días de prueba sin tarjeta. Puedes cancelar cuando quieras.
      </p>
    </div>
  );
}

export function BillingPanelFallback() {
  return (
    <div className="space-y-8">
      <div className="h-24 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-900" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-56 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-900"
          />
        ))}
      </div>
    </div>
  );
}

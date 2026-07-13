import { redirect } from "next/navigation";
import { getUserPlan } from "@/lib/billing";
import { type PlanFeature, planHas } from "@/lib/plans";

// ¿Este usuario tiene acceso a la feature según su plan? Fuente única para el
// gating a nivel de usuario (server actions, pages, componentes de servidor).
export async function userHasFeature(
  userId: string,
  feature: PlanFeature,
): Promise<boolean> {
  const plan = await getUserPlan(userId);
  return planHas(plan, feature);
}

// Barrera de servidor para páginas premium: si el plan no incluye la feature,
// manda a Facturación con el motivo, para mostrar el upsell allí.
export async function requireFeature(
  userId: string,
  feature: PlanFeature,
): Promise<void> {
  if (!(await userHasFeature(userId, feature))) {
    redirect(`/dashboard/billing?upsell=${feature}`);
  }
}

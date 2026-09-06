import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, subscriptions } from "@/db/schema";
import { PLANS, type PlanId } from "@/lib/plans";

export type SubscriptionInfo = {
  plan: PlanId;
  stripeCustomerId: string | null;
};

// Plan y cliente de Stripe en la misma consulta: el panel necesita los dos, y
// el customerId es lo que abre el portal donde se cancela.
export async function getSubscription(
  userId: string,
): Promise<SubscriptionInfo> {
  const [row] = await db
    .select({
      plan: subscriptions.plan,
      stripeCustomerId: subscriptions.stripeCustomerId,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return {
    plan: row?.plan ?? "free",
    stripeCustomerId: row?.stripeCustomerId ?? null,
  };
}

export async function getUserPlan(userId: string): Promise<PlanId> {
  return (await getSubscription(userId)).plan;
}

// "Activas" = en seguimiento: estado 'sent' (no pagadas ni incobrables).
export async function countActiveInvoices(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(invoices)
    .where(and(eq(invoices.userId, userId), eq(invoices.status, "sent")));
  return row.n;
}

export type PlanUsage = {
  plan: PlanId;
  active: number;
  limit: number | null;
  canAdd: boolean;
  stripeCustomerId: string | null;
};

export async function getPlanUsage(userId: string): Promise<PlanUsage> {
  const [sub, active] = await Promise.all([
    getSubscription(userId),
    countActiveInvoices(userId),
  ]);
  const limit = PLANS[sub.plan].activeInvoiceLimit;
  return {
    plan: sub.plan,
    active,
    limit,
    canAdd: limit === null || active < limit,
    stripeCustomerId: sub.stripeCustomerId,
  };
}

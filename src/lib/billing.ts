import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices, subscriptions } from "@/db/schema";
import { PLANS, type PlanId } from "@/lib/plans";

export async function getUserPlan(userId: string): Promise<PlanId> {
  const [row] = await db
    .select({ plan: subscriptions.plan })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return row?.plan ?? "free";
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
};

export async function getPlanUsage(userId: string): Promise<PlanUsage> {
  const [plan, active] = await Promise.all([
    getUserPlan(userId),
    countActiveInvoices(userId),
  ]);
  const limit = PLANS[plan].activeInvoiceLimit;
  return { plan, active, limit, canAdd: limit === null || active < limit };
}

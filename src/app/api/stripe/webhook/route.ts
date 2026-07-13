import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { newId } from "@/lib/ids";
import { type PlanId, PLANS } from "@/lib/plans";
import { stripe } from "@/lib/stripe";

function asPlan(value: unknown): PlanId | null {
  return typeof value === "string" && value in PLANS ? (value as PlanId) : null;
}

function periodEnd(sub: Stripe.Subscription): Date | null {
  // current_period_end vive en el sub o (API recientes) en el item.
  const ts =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    sub.items?.data?.[0]?.current_period_end;
  return ts ? new Date(ts * 1000) : null;
}

// Alta/actualización por usuario (subscriptions.userId es único).
async function upsertByUser(
  userId: string,
  values: Partial<typeof subscriptions.$inferInsert>,
) {
  await db
    .insert(subscriptions)
    .values({ id: newId("sub"), userId, plan: "free", ...values })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: { ...values, updatedAt: new Date() },
    });
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return new NextResponse("STRIPE_WEBHOOK_SECRET no configurado", {
      status: 500,
    });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return new NextResponse(`Firma inválida: ${(err as Error).message}`, {
      status: 400,
    });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      const plan = asPlan(s.metadata?.plan);
      const userId = s.metadata?.userId;
      if (userId && plan) {
        await upsertByUser(userId, {
          plan,
          status: "active",
          stripeCustomerId: (s.customer as string) ?? null,
          stripeSubscriptionId: (s.subscription as string) ?? null,
        });
      }
      break;
    }

    // 'created' llega al abrir la suscripción (tras el checkout) y trae ya
    // el current_period_end; 'updated' en cada cambio/renovación. Misma
    // lógica: sincronizar plan, estado y fin de periodo desde la metadata.
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const plan = asPlan(sub.metadata?.plan);
      const userId = sub.metadata?.userId;
      if (userId && plan) {
        await upsertByUser(userId, {
          plan,
          status: sub.status,
          currentPeriodEnd: periodEnd(sub),
          stripeCustomerId: sub.customer as string,
          stripeSubscriptionId: sub.id,
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const userId = sub.metadata?.userId;
      if (userId) {
        await upsertByUser(userId, { plan: "free", status: "canceled" });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const subId = (invoice as unknown as { subscription?: string })
        .subscription;
      if (subId) {
        await db
          .update(subscriptions)
          .set({ status: "past_due", updatedAt: new Date() })
          .where(eq(subscriptions.stripeSubscriptionId, subId));
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

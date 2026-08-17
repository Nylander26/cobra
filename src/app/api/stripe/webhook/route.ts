import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/db";
import { subscriptions, user } from "@/db/schema";
import { newId } from "@/lib/ids";
import { leerAtribucion, marcarPurchaseEnviado } from "@/lib/meta/attrib";
import { enviarEventoMeta } from "@/lib/meta/capi";
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

// user_data para Meta. La metadata de Stripe es la fuente buena: se capturó en
// el mismo navegador que hizo clic en el anuncio, al abrir el checkout. La
// fila en `events` es el respaldo por si el checkout se creó antes de que
// existiera esta instrumentación.
async function datosMeta(userId: string, metadata: Stripe.Metadata | null) {
  const [fila] = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  const guardada = await leerAtribucion(userId);

  return {
    email: fila?.email ?? null,
    externalId: userId,
    fbp: metadata?.fbp ?? guardada.fbp ?? null,
    fbc: metadata?.fbc ?? guardada.fbc ?? null,
    clientIp: guardada.clientIp ?? null,
    clientUserAgent: guardada.clientUserAgent ?? null,
  };
}

// La suscripción y su metadata cambiaron de sitio entre versiones de la API de
// Stripe (raíz → `parent.subscription_details`). Se miran las dos.
function detallesSuscripcion(invoice: Stripe.Invoice) {
  const i = invoice as unknown as {
    subscription?: string;
    subscription_details?: { metadata?: Stripe.Metadata | null };
    parent?: {
      subscription_details?: {
        subscription?: string;
        metadata?: Stripe.Metadata | null;
      };
    };
  };
  return {
    subscriptionId:
      i.subscription ?? i.parent?.subscription_details?.subscription ?? null,
    metadata:
      i.subscription_details?.metadata ??
      i.parent?.subscription_details?.metadata ??
      null,
  };
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

        // StartTrial, no Purchase: esta sesión se completa con 0 € porque el
        // trial es de 14 días sin tarjeta. La venta llega en invoice.paid.
        // predicted_ltv le da a Meta con qué optimizar mientras no hay cobros.
        await enviarEventoMeta({
          eventName: "StartTrial",
          eventId: `trial_${s.id}`,
          actionSource: "system_generated",
          userData: await datosMeta(userId, s.metadata),
          customData: {
            value: 0,
            currency: "EUR",
            predicted_ltv: (PLANS[plan].priceCents / 100) * 12,
          },
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

    // La venta de verdad: el primer cobro con importe, cuando el trial de 14
    // días convierte. Antes de esto no ha entrado un euro.
    case "invoice.paid": {
      const invoice = event.data.object;
      // La factura del trial se emite a 0 €: no es una compra.
      if ((invoice.amount_paid ?? 0) <= 0) break;

      const { subscriptionId, metadata } = detallesSuscripcion(invoice);
      let userId = metadata?.userId ?? null;
      if (!userId && subscriptionId) {
        const [fila] = await db
          .select({ userId: subscriptions.userId })
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
          .limit(1);
        userId = fila?.userId ?? null;
      }
      if (!userId || !subscriptionId) break;

      // invoice.paid se dispara en cada renovación mensual y con un invoice.id
      // distinto cada vez, así que la deduplicación de Meta no lo frena: sin
      // esta guarda se reportaría una venta nueva todos los meses.
      if (!(await marcarPurchaseEnviado(userId, subscriptionId))) break;

      await enviarEventoMeta({
        eventName: "Purchase",
        eventId: invoice.id ?? `purchase_${subscriptionId}`,
        actionSource: "system_generated",
        userData: await datosMeta(userId, metadata),
        customData: {
          value: invoice.amount_paid / 100,
          currency: (invoice.currency ?? "eur").toUpperCase(),
        },
      });
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

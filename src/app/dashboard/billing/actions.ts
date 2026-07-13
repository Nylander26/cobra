"use server";

import { redirect } from "next/navigation";
import { PLANS, type PlanId } from "@/lib/plans";
import { requireSession } from "@/lib/session";
import { isLiveKey, stripe } from "@/lib/stripe";

const APP_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export async function startCheckout(formData: FormData): Promise<void> {
  const { user } = await requireSession();
  const planId = String(formData.get("plan") ?? "") as PlanId;
  const plan = PLANS[planId];

  // Nada que cobrar en el plan gratuito.
  if (!plan || plan.priceCents <= 0) redirect("/dashboard/billing");

  // Seguridad: nunca abrir un checkout LIVE mientras se desarrolla.
  if (isLiveKey() && process.env.NODE_ENV !== "production") {
    throw new Error(
      "Checkout en modo LIVE bloqueado en desarrollo. Configura una clave sk_test_.",
    );
  }

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    client_reference_id: user.id,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          product_data: { name: `Cobra ${plan.name}` },
          unit_amount: plan.priceCents,
          recurring: { interval: "month" },
        },
      },
    ],
    subscription_data: {
      trial_period_days: 14,
      metadata: { userId: user.id, plan: planId },
    },
    // El webhook (pendiente) leerá esto para activar el plan tras el pago.
    metadata: { userId: user.id, plan: planId },
    success_url: `${APP_URL}/dashboard/billing?checkout=success`,
    cancel_url: `${APP_URL}/dashboard/billing?checkout=cancel`,
  });

  if (!session.url) throw new Error("Stripe no devolvió URL de checkout");
  redirect(session.url);
}

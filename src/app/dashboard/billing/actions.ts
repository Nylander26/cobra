"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { guardarAtribucion } from "@/lib/meta/attrib";
import { enviarEventoMeta } from "@/lib/meta/capi";
import { PLANS, type PlanId } from "@/lib/plans";
import { requireSession } from "@/lib/session";
import { isLiveKey, stripe } from "@/lib/stripe";

const APP_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export type CheckoutResult = { url?: string; error?: string };

// Devuelve la URL de pago en vez de redirigir: el cliente la abre en una
// pestaña nueva (window.open dentro del gesto del click) con estado de carga.
export async function startCheckout(
  planInput: string,
  // Lo genera el botón para que píxel y CAPI manden el mismo evento. Opcional:
  // sin consentimiento de marketing el cliente no lo envía.
  metaEventId?: string,
): Promise<CheckoutResult> {
  const { user } = await requireSession();
  const planId = planInput as PlanId;
  const plan = PLANS[planId];

  // Nada que cobrar en el plan gratuito.
  if (!plan || plan.priceCents <= 0) redirect("/dashboard/billing");

  // Seguridad: nunca abrir un checkout LIVE mientras se desarrolla.
  if (isLiveKey() && process.env.NODE_ENV !== "production") {
    return {
      error:
        "Checkout en modo LIVE bloqueado en desarrollo. Configura una clave sk_test_.",
    };
  }

  // Las cookies de Meta se leen AQUÍ, que es la última vez que hay navegador
  // en la ecuación. El cobro real llega catorce días después por webhook, sin
  // request de nadie: si no se capturan ahora, esa venta llega sin atribuir.
  // Una server action ya es dinámica, así que leer cookies() no cuesta nada.
  const cookieStore = await cookies();
  const h = await headers();
  const fbp = cookieStore.get("_fbp")?.value ?? null;
  const fbc = cookieStore.get("_fbc")?.value ?? null;
  const clientIp = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const clientUserAgent = h.get("user-agent");
  await guardarAtribucion(user.id, { fbp, fbc, clientIp, clientUserAgent });

  // Viajan dentro de Stripe para volver en checkout.session.completed y, vía
  // subscription_details, en invoice.paid.
  const metaMetadata = { ...(fbp ? { fbp } : {}), ...(fbc ? { fbc } : {}) };

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
    // La promesa del copy es "14 días de prueba sin tarjeta": no se pide
    // método de pago al empezar. Si al acabar el trial no lo ha añadido, la
    // suscripción se cancela sola y el webhook lo devuelve al plan Free.
    payment_method_collection: "if_required",
    subscription_data: {
      trial_period_days: 14,
      trial_settings: {
        end_behavior: { missing_payment_method: "cancel" },
      },
      metadata: { userId: user.id, plan: planId, ...metaMetadata },
    },
    // El webhook (pendiente) leerá esto para activar el plan tras el pago.
    metadata: { userId: user.id, plan: planId },
    success_url: `${APP_URL}/dashboard/billing?checkout=success`,
    cancel_url: `${APP_URL}/dashboard/billing?checkout=cancel`,
  });

  if (!session.url) {
    return { error: "No se pudo iniciar el pago. Inténtalo de nuevo." };
  }

  if (metaEventId) {
    await enviarEventoMeta({
      eventName: "InitiateCheckout",
      eventId: metaEventId,
      userData: {
        email: user.email,
        externalId: user.id,
        fbp,
        fbc,
        clientIp,
        clientUserAgent,
      },
      customData: { value: plan.priceCents / 100, currency: "EUR" },
    });
  }

  return { url: session.url };
}

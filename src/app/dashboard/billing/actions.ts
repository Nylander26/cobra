"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { guardarAtribucion } from "@/lib/meta/attrib";
import { enviarEventoMeta } from "@/lib/meta/capi";
import { getSubscription } from "@/lib/billing";
import { PLANS, type PlanId } from "@/lib/plans";
import { requireSession } from "@/lib/session";
import { isLiveKey, stripe } from "@/lib/stripe";

const APP_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

// Stripe Tax se enciende cuando el alta censal (036) está presentada y la
// jurisdicción registrada en el panel de Stripe. Antes de eso, pedirle a
// Stripe que calcule impuestos hace fallar la creación de la sesión y deja
// el checkout muerto, así que va detrás de una variable y apagado por
// defecto. Encenderla es un acto deliberado, no el estado inicial.
const TAX_ENABLED = process.env.STRIPE_TAX_ENABLED === "true";

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
          // Los precios anunciados llevan el IVA dentro (12 € = 9,92 € +
          // 2,08 €), que es como deben mostrarse a consumidores. Sin esto
          // Stripe Tax rechaza el precio por indefinido.
          tax_behavior: "inclusive",
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
    // Con Tax activo Stripe calcula y desglosa el IVA en la factura, que es
    // lo que convierte el recibo en una factura válida para el cliente.
    automatic_tax: { enabled: TAX_ENABLED },
    // Los clientes son autónomos y empresas: sin recoger su NIF no pueden
    // deducirse la factura y acaban pidiéndola por soporte.
    tax_id_collection: { enabled: TAX_ENABLED },
    // Tax necesita la dirección para determinar la jurisdicción; sin ella no
    // sabe qué tipo aplicar.
    ...(TAX_ENABLED ? { billing_address_collection: "required" as const } : {}),
    // El webhook lee esto en checkout.session.completed para activar el plan.
    metadata: { userId: user.id, plan: planId },
    // El producto es español; sin esto Stripe sirve el checkout en inglés.
    locale: "es",
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

export type PortalResult = { url?: string; error?: string };

// Portal de cliente de Stripe: es el único sitio donde el usuario puede
// cancelar, cambiar de tarjeta o descargar sus facturas. Sin esto la
// suscripción solo se puede anular escribiendo a soporte, y el copy que
// promete "cancela cuando quieras" sería falso.
export async function openBillingPortal(): Promise<PortalResult> {
  const { user } = await requireSession();
  const { stripeCustomerId } = await getSubscription(user.id);

  if (!stripeCustomerId) {
    return { error: "No hay ninguna suscripción activa que gestionar." };
  }

  try {
    const session = await stripe().billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${APP_URL}/dashboard/billing`,
      locale: "es",
    });
    return { url: session.url };
  } catch (err) {
    // El portal necesita una configuración guardada en el dashboard de
    // Stripe. Si falta, la API responde con un error de configuración y el
    // usuario se quedaría sin saber por qué no se abre nada.
    console.error("No se pudo abrir el portal de Stripe", err);
    return {
      error:
        "No se pudo abrir la gestión de la suscripción. Inténtalo de nuevo o escríbenos.",
    };
  }
}

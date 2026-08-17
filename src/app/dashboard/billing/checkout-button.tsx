"use client";

import { useState } from "react";
import { Spinner } from "@/components/icons";
import { nuevoEventId, trackPixel } from "@/lib/meta/client";
import { PLANS, type PlanId } from "@/lib/plans";
import { startCheckout } from "./actions";

// Abre el checkout de Stripe en una pestaña nueva con candado anti
// doble-click. La pestaña se abre VACÍA dentro del gesto del click (los
// bloqueadores de popups solo permiten window.open síncrono) y se le asigna
// la URL cuando el servidor la devuelve; si algo falla, se cierra.
export function CheckoutButton({
  plan,
  label,
}: {
  plan: string;
  label: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (pending) return;
    setPending(true);
    setError(null);

    // window.open PRIMERO y de forma síncrona dentro del gesto del clic: si se
    // mete cualquier cosa antes, el bloqueador de popups lo mata.
    const tab = window.open("", "_blank");

    // El id nace aquí y viaja a la server action, que manda el mismo evento
    // por CAPI. Mismo id en los dos canales = una sola conversión en Meta.
    const eventId = nuevoEventId();
    const precio = PLANS[plan as PlanId]?.priceCents;
    trackPixel(
      "InitiateCheckout",
      precio ? { value: precio / 100, currency: "EUR" } : undefined,
      eventId,
    );

    try {
      const result = await startCheckout(plan, eventId);
      if (result.url) {
        if (tab) {
          tab.location.href = result.url;
        } else {
          // Popup bloqueado: mejor navegar aquí que perder el pago.
          window.location.href = result.url;
        }
      } else {
        tab?.close();
        setError(result.error ?? "No se pudo iniciar el pago. Inténtalo de nuevo.");
      }
    } catch {
      tab?.close();
      setError("No se pudo iniciar el pago. Inténtalo de nuevo.");
    }
    setPending(false);
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-cobra px-4 py-2 text-sm font-medium text-white transition hover:bg-cobra-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra disabled:opacity-60"
      >
        {pending && <Spinner className="h-4 w-4" />}
        {pending ? "Abriendo el pago…" : label}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

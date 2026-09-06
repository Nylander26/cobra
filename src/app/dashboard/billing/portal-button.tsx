"use client";

import { useState } from "react";
import { Spinner } from "@/components/icons";
import { openBillingPortal } from "./actions";

// Mismo patrón que CheckoutButton: la pestaña se abre VACÍA y de forma
// síncrona dentro del gesto del clic, porque los bloqueadores de popups solo
// dejan pasar window.open síncrono; la URL se le asigna cuando llega.
export function PortalButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (pending) return;
    setPending(true);
    setError(null);

    const tab = window.open("", "_blank");

    try {
      const result = await openBillingPortal();
      if (result.url) {
        if (tab) {
          tab.location.href = result.url;
        } else {
          window.location.href = result.url;
        }
      } else {
        tab?.close();
        setError(result.error ?? "No se pudo abrir la gestión del plan.");
      }
    } catch {
      tab?.close();
      setError("No se pudo abrir la gestión del plan.");
    }
    setPending(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-50 dark:hover:text-neutral-50"
      >
        {pending && <Spinner className="h-4 w-4" />}
        {pending ? "Abriendo…" : "Gestionar suscripción"}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { createBrand, type BrandFormState } from "./actions";
import { BrandFields, type BrandPlaceholders } from "./brand-card";

const initial: BrandFormState = {};

export function NewBrandForm({
  placeholders,
}: {
  placeholders: BrandPlaceholders;
}) {
  const [state, action, pending] = useActionState(createBrand, initial);
  const formRef = useRef<HTMLFormElement>(null);

  // Tras crear, limpia el formulario (la nueva marca aparece arriba al
  // revalidar la lista).
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-4 rounded-xl border border-dashed border-neutral-300 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900"
    >
      <h2 className="font-semibold text-neutral-900 dark:text-neutral-50">
        Nueva marca
      </h2>

      <BrandFields placeholders={placeholders} />

      {state.ok && (
        <p
          role="status"
          className="rounded-lg border border-cobra/30 bg-cobra/10 px-3 py-2 text-sm text-cobra dark:text-verde-claro"
        >
          Marca creada.
        </p>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-cobra px-5 py-2.5 text-sm font-medium text-white transition hover:bg-cobra-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra disabled:opacity-50"
        >
          {pending ? "Creando…" : "Crear marca"}
        </button>
      </div>
    </form>
  );
}

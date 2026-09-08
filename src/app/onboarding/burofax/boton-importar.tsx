"use client";

import { useActionState } from "react";
import { type ImportarState, importarBurofax } from "./actions";

export function BotonImportar({ claimToken }: { claimToken: string }) {
  const [state, formAction, pending] = useActionState<ImportarState, FormData>(
    importarBurofax,
    {},
  );

  return (
    <form action={formAction} className="mt-6">
      <input type="hidden" name="t" value={claimToken} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-cobra px-5 py-2.5 text-sm font-medium text-white transition hover:bg-cobra-oscuro disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra"
      >
        {pending ? "Guardando…" : "Guardar la factura y avisarme"}
      </button>
      {state.error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

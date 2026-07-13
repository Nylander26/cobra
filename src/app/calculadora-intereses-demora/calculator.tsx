"use client";

import { useState } from "react";
import {
  computeLateInterest,
  type LateInterest,
} from "@/lib/late-interest";
import { formatCents, parseAmountToCents } from "@/lib/money";

type Result = LateInterest & { amountCents: number };

// El cálculo corre solo en el handler (nunca en render): "hoy" se decide al
// pulsar el botón y la página queda 100 % estática.
export function Calculator() {
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const amountCents = parseAmountToCents(String(form.get("importe")));
    const dueRaw = String(form.get("vencimiento"));

    if (!amountCents || amountCents <= 0) {
      setError("Escribe el importe de la factura (por ejemplo 1.250,50).");
      setResult(null);
      return;
    }
    const dueDate = new Date(`${dueRaw}T00:00:00Z`);
    if (!dueRaw || Number.isNaN(dueDate.getTime())) {
      setError("Escribe la fecha de vencimiento de la factura.");
      setResult(null);
      return;
    }

    const asOf = new Date();
    if (dueDate > asOf) {
      setError(
        "Esa factura aún no ha vencido: no devenga intereses de demora todavía.",
      );
      setResult(null);
      return;
    }

    setResult({ ...computeLateInterest(amountCents, dueDate, asOf), amountCents });
  }

  return (
    <div className="rounded-2xl border border-linea bg-white p-6 shadow-[0_1px_2px_rgba(18,36,28,0.06)] sm:p-8">
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-grafito">
            Importe de la factura (€)
          </span>
          <input
            name="importe"
            type="text"
            inputMode="decimal"
            placeholder="1.250,50"
            required
            className="w-full rounded-lg border border-linea bg-white px-3 py-2 text-sm text-tinta outline-none transition placeholder:text-grafito/40 focus:border-cobra focus:ring-1 focus:ring-cobra"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-grafito">
            Fecha de vencimiento
          </span>
          <input
            name="vencimiento"
            type="date"
            required
            className="w-full rounded-lg border border-linea bg-white px-3 py-2 text-sm text-tinta outline-none transition focus:border-cobra focus:ring-1 focus:ring-cobra"
          />
        </label>
        <button
          type="submit"
          className="self-end rounded-lg bg-cobra px-5 py-2 text-sm font-medium text-white transition hover:bg-cobra-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra"
        >
          Calcular
        </button>
      </form>

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-6 border-t border-linea pt-6" aria-live="polite">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-grafito/60">
                Interés de demora
              </p>
              <p className="mt-1 text-2xl font-semibold text-tinta">
                {formatCents(result.interesCents)}
              </p>
              <p className="text-xs text-grafito/60">
                {result.dias} {result.dias === 1 ? "día" : "días"} de mora
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-grafito/60">
                Costes de cobro (art. 8)
              </p>
              <p className="mt-1 text-2xl font-semibold text-tinta">
                {formatCents(result.compensacionCents)}
              </p>
              <p className="text-xs text-grafito/60">fijos, por factura</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-cobra">
                Total reclamable extra
              </p>
              <p className="mt-1 text-2xl font-semibold text-cobra">
                {formatCents(result.totalCents)}
              </p>
              <p className="text-xs text-grafito/60">
                además de los {formatCents(result.amountCents)} de la factura
              </p>
            </div>
          </div>

          {result.segments.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[24rem] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-grafito/60">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Semestre</th>
                    <th className="py-2 pr-4 font-medium">Tipo anual</th>
                    <th className="py-2 pr-4 font-medium">Días</th>
                    <th className="py-2 font-medium">Interés</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linea">
                  {result.segments.map((s) => (
                    <tr key={s.periodo}>
                      <td className="py-2 pr-4 text-tinta">{s.periodo}</td>
                      <td className="py-2 pr-4 text-grafito">
                        {s.tipo.toLocaleString("es-ES")} %{s.estimated ? " *" : ""}
                      </td>
                      <td className="py-2 pr-4 text-grafito">{s.dias}</td>
                      <td className="py-2 text-tinta">
                        {formatCents(s.interesCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.estimated && (
                <p className="mt-2 text-xs text-grafito/60">
                  * Tipo estimado: el BOE aún no ha publicado el de ese
                  semestre; se usa el último conocido.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

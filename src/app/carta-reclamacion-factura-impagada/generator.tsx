"use client";

import { useState } from "react";
import Link from "next/link";
import { computeLateInterest } from "@/lib/late-interest";
import { formatCents, parseAmountToCents } from "@/lib/money";
import {
  buildLetter,
  TONE_META,
  TONE_ORDER,
  type Letter,
  type LetterTone,
} from "./templates";

const DAY = 86400000;

type Result = Letter & {
  tone: LetterTone;
  interesLinea: string | null; // desglose bajo la carta, solo tono final
};

// Todo corre en el handler (nunca en render): "hoy" se decide al pulsar
// "Generar" y la página queda 100 % estática.
export function Generator() {
  const [tone, setTone] = useState<LetterTone>("firm");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState<"subject" | "body" | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCopied(null);

    const form = new FormData(event.currentTarget);
    const contacto = String(form.get("contacto") ?? "").trim();
    const numero = String(form.get("numero") ?? "").trim();
    const remitente = String(form.get("remitente") ?? "").trim();
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

    const now = new Date();
    const diasRetraso = Math.max(
      0,
      Math.floor((now.getTime() - dueDate.getTime()) / DAY),
    );
    const vencida = diasRetraso >= 1;

    if (tone === "friendly" && vencida) {
      setError(
        "Esa factura ya ha vencido: el recordatorio amable llega tarde. Usa el tono firme o la última notificación.",
      );
      setResult(null);
      return;
    }
    if ((tone === "firm" || tone === "final") && !vencida) {
      setError(
        "Esa factura aún no ha vencido. Para avisar antes del vencimiento usa el tono amable; el día del vencimiento, el neutro.",
      );
      setResult(null);
      return;
    }

    let interes: string | null = null;
    let interesLinea: string | null = null;
    if (tone === "final") {
      const li = computeLateInterest(amountCents, dueDate, now);
      if (li.interesCents > 0) {
        interes = formatCents(li.interesCents);
        interesLinea = `Interés devengado: ${formatCents(li.interesCents)} · Costes de cobro (art. 8): ${formatCents(li.compensacionCents)} · Total extra reclamable: ${formatCents(li.totalCents)}`;
      }
    }

    const letter = buildLetter(tone, {
      contacto,
      numero,
      importe: formatCents(amountCents),
      vencimiento: dueDate.toLocaleDateString("es-ES", {
        timeZone: "UTC",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      diasRetraso,
      interes,
      remitente,
    });
    setResult({ ...letter, tone, interesLinea });
  }

  async function copy(kind: "subject" | "body", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Sin permiso de portapapeles: el texto queda visible para copiar a mano.
    }
  }

  const inputClass =
    "w-full rounded-lg border border-linea bg-white px-3 py-2 text-sm text-tinta outline-none transition placeholder:text-grafito/40 focus:border-cobra focus:ring-1 focus:ring-cobra";

  return (
    <div className="rounded-2xl border border-linea bg-white p-6 shadow-[0_1px_2px_rgba(18,36,28,0.06)] sm:p-8">
      <form onSubmit={onSubmit} className="space-y-5">
        <fieldset>
          <legend className="text-sm font-medium text-grafito">
            ¿En qué punto está la factura?
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-4">
            {TONE_ORDER.map((t) => (
              <label
                key={t}
                className={`cursor-pointer rounded-lg border px-3 py-2.5 transition ${
                  tone === t
                    ? "border-cobra bg-cobra/5"
                    : "border-linea hover:border-cobra/40"
                }`}
              >
                <input
                  type="radio"
                  name="tono"
                  value={t}
                  checked={tone === t}
                  onChange={() => setTone(t)}
                  className="sr-only"
                />
                <span
                  className={`block text-sm font-medium ${tone === t ? "text-cobra" : "text-tinta"}`}
                >
                  {TONE_META[t].label}
                </span>
                <span className="mt-0.5 block font-mono text-[11px] text-grafito/60">
                  {TONE_META[t].cuando}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-grafito">
              Nombre de tu contacto
            </span>
            <input
              name="contacto"
              type="text"
              placeholder="María"
              required
              className={inputClass}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-grafito">
              Número de la factura
            </span>
            <input
              name="numero"
              type="text"
              placeholder="2026-014"
              required
              className={inputClass}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-grafito">
              Importe (€)
            </span>
            <input
              name="importe"
              type="text"
              inputMode="decimal"
              placeholder="1.250,50"
              required
              className={inputClass}
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
              className={inputClass}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-grafito">
              Tu nombre (como firmas los emails)
            </span>
            <input
              name="remitente"
              type="text"
              placeholder="Wolf · Estudio Wolf"
              required
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-cobra px-5 py-2 text-sm font-medium text-white transition hover:bg-cobra-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra"
          >
            Generar la carta
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-6 border-t border-linea pt-6" aria-live="polite">
          <div className="rounded-xl border border-linea bg-papel/60">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-linea px-4 py-3 sm:px-5">
              <p className="text-sm text-tinta">
                <span className="font-mono text-xs uppercase tracking-wide text-grafito/60">
                  Asunto:{" "}
                </span>
                <span className="font-medium">{result.subject}</span>
              </p>
              <button
                type="button"
                onClick={() => copy("subject", result.subject)}
                className="rounded-md border border-linea px-2.5 py-1 font-mono text-xs text-grafito transition hover:border-cobra/40 hover:text-cobra"
              >
                {copied === "subject" ? "Copiado ✓" : "Copiar asunto"}
              </button>
            </div>
            <div className="px-4 py-4 sm:px-5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-grafito">
                {result.body}
              </p>
              {result.interesLinea && (
                <p className="mt-4 border-t border-linea pt-3 font-mono text-xs text-cobra">
                  {result.interesLinea}{" "}
                  <Link
                    href="/calculadora-intereses-demora"
                    className="underline decoration-cobra/40 underline-offset-4"
                  >
                    Ver el cálculo →
                  </Link>
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => copy("body", result.body)}
              className="rounded-lg bg-tinta px-4 py-2 text-sm font-medium text-marfil transition hover:bg-grafito focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta"
            >
              {copied === "body" ? "Copiado ✓" : "Copiar el mensaje"}
            </button>
            <p className="text-xs text-grafito/60">
              Envíala desde tu correo habitual, el mismo con el que facturas.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-cobra/25 bg-cobra/5 p-4 sm:p-5">
            <p className="text-sm leading-relaxed text-grafito">
              <strong className="font-semibold text-tinta">
                ¿Y si no tuvieras que volver a escribir esta carta?
              </strong>{" "}
              Cobra envía esta secuencia completa por ti —amable, neutra, firme
              y última notificación— en tu nombre y hasta que te paguen. Con 2
              facturas en seguimiento gratis.
            </p>
            <Link
              href="/signup"
              className="mt-3 inline-block rounded-lg bg-cobra px-4 py-2 text-sm font-medium text-white transition hover:bg-cobra-oscuro"
            >
              Reclamar esta factura en automático
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useActionState, useState } from "react";
import { IconTrash } from "@/components/icons";
import type { ReminderTone, SequenceStep } from "@/lib/default-sequence";
import { saveSequence, type SequenceState } from "./actions";

const TONE_OPTIONS: { value: ReminderTone; label: string }[] = [
  { value: "friendly", label: "Amistoso" },
  { value: "neutral", label: "Neutral" },
  { value: "firm", label: "Firme" },
  { value: "final", label: "Final" },
];

const MAX_STEPS = 8;

const VARIABLES = [
  "{{cliente}}",
  "{{numero}}",
  "{{importe}}",
  "{{vencimiento}}",
  "{{dias_retraso}}",
  "{{remitente}}",
  "{{firma}}",
];

type EditStep = {
  id?: string;
  offsetDays: number;
  subject: string;
  body: string;
  tone: ReminderTone;
};

function offsetLabel(n: number): string {
  const abs = Math.abs(n);
  const unit = abs === 1 ? "día" : "días";
  if (n < 0) return `${abs} ${unit} antes del vencimiento`;
  if (n === 0) return "El día del vencimiento";
  return `${n} ${unit} después del vencimiento`;
}

const inputBase =
  "rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-cobra focus:ring-1 focus:ring-cobra dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50";

const initial: SequenceState = {};

export function SequenceEditor({
  initialSteps,
}: {
  initialSteps: SequenceStep[];
}) {
  const [steps, setSteps] = useState<EditStep[]>(initialSteps);
  const [state, action, pending] = useActionState(saveSequence, initial);

  // Tras guardar, sincroniza con los pasos persistidos (ids reales) para que
  // re-guardar no duplique pasos nuevos ni cambie el orden. Se ajusta el estado
  // en render (patrón oficial de React con tracker del último valor aplicado),
  // no en un efecto.
  const [lastSaved, setLastSaved] = useState<SequenceStep[] | undefined>(
    undefined,
  );
  if (state.steps && state.steps !== lastSaved) {
    setLastSaved(state.steps);
    setSteps(state.steps);
  }

  function update(i: number, patch: Partial<EditStep>) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function remove(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i));
  }
  function add() {
    setSteps((prev) => {
      if (prev.length >= MAX_STEPS) return prev;
      const lastOffset = prev.length ? prev[prev.length - 1].offsetDays : 0;
      return [
        ...prev,
        { offsetDays: lastOffset + 7, subject: "", body: "", tone: "neutral" },
      ];
    });
  }

  return (
    <form action={action} className="animate-rise space-y-6">
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900/50">
        <p className="font-medium text-neutral-700 dark:text-neutral-300">
          Variables disponibles
        </p>
        <p className="mt-0.5 text-neutral-500">
          Escríbelas en el asunto o el mensaje; se sustituyen al enviar cada
          recordatorio.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {VARIABLES.map((v) => (
            <code
              key={v}
              className="rounded bg-white px-1.5 py-0.5 text-xs text-cobra ring-1 ring-neutral-200 dark:bg-neutral-950 dark:text-verde-claro dark:ring-neutral-800"
            >
              {v}
            </code>
          ))}
        </div>
      </div>

      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li
            key={step.id ?? `new-${i}`}
            className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  {i + 1}
                </span>
                <input
                  type="number"
                  min={-30}
                  max={365}
                  step={1}
                  value={step.offsetDays}
                  onChange={(e) =>
                    update(i, {
                      offsetDays: Math.trunc(Number(e.target.value) || 0),
                    })
                  }
                  aria-label="Días respecto al vencimiento"
                  className={`h-9 w-20 px-2 ${inputBase}`}
                />
                <span className="text-xs text-neutral-500">
                  {offsetLabel(step.offsetDays)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={step.tone}
                  onChange={(e) =>
                    update(i, { tone: e.target.value as ReminderTone })
                  }
                  aria-label="Tono del mensaje"
                  className={`h-9 px-2 ${inputBase}`}
                >
                  {TONE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  disabled={steps.length <= 1}
                  aria-label="Quitar paso"
                  title="Quitar paso"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700"
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              </div>
            </div>

            <input
              type="text"
              value={step.subject}
              onChange={(e) => update(i, { subject: e.target.value })}
              maxLength={200}
              placeholder="Asunto del correo"
              className={`h-10 w-full px-3 ${inputBase}`}
            />
            <textarea
              value={step.body}
              onChange={(e) => update(i, { body: e.target.value })}
              maxLength={5000}
              rows={7}
              placeholder="Cuerpo del mensaje"
              className={`w-full resize-y px-3 py-2 ${inputBase}`}
            />
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={add}
        disabled={steps.length >= MAX_STEPS}
        className="w-full rounded-xl border border-dashed border-neutral-300 py-2.5 text-sm font-medium text-neutral-600 transition hover:border-cobra hover:text-cobra disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-400"
      >
        + Añadir paso
      </button>

      <input type="hidden" name="steps" value={JSON.stringify(steps)} />

      {state.ok && (
        <p
          role="status"
          className="rounded-lg border border-cobra/30 bg-cobra/10 px-3 py-2 text-sm text-cobra dark:text-verde-claro"
        >
          Secuencia guardada.
        </p>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-neutral-400">
          Los cambios se aplican a las facturas que crees a partir de ahora.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-cobra px-5 py-2.5 text-sm font-medium text-white transition hover:bg-cobra-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar secuencia"}
        </button>
      </div>
    </form>
  );
}

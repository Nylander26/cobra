"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendSupportMessage, type SupportState } from "./actions";

const initial: SupportState = {};

const TIPOS = [
  { value: "sugerencia", label: "Sugerencia — una idea o función nueva" },
  { value: "problema", label: "Problema — algo no funciona" },
  { value: "pregunta", label: "Pregunta — necesito ayuda" },
];

export function SupportForm() {
  const [state, action, pending] = useActionState(sendSupportMessage, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={action}
      className="animate-rise max-w-xl space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <label className="block space-y-1">
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Tipo
        </span>
        <select
          name="type"
          required
          defaultValue="sugerencia"
          className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-cobra focus:ring-1 focus:ring-cobra dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50"
        >
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Mensaje
        </span>
        <textarea
          name="message"
          required
          rows={6}
          minLength={10}
          maxLength={5000}
          placeholder="Cuéntanos con detalle. Si es un problema, indícanos qué esperabas y qué pasó."
          className="w-full resize-y rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-cobra focus:ring-1 focus:ring-cobra dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50"
        />
      </label>

      {state.ok && (
        <p
          role="status"
          className="rounded-lg border border-cobra/30 bg-cobra/10 px-3 py-2 text-sm text-cobra dark:text-verde-claro"
        >
          ¡Recibido! Te responderemos a tu email. Gracias por ayudarnos a
          mejorar Cobra.
        </p>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-neutral-400">
          Responderemos a tu correo de la cuenta.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-cobra px-5 py-2.5 text-sm font-medium text-white transition hover:bg-cobra-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra disabled:opacity-50"
        >
          {pending ? "Enviando…" : "Enviar"}
        </button>
      </div>
    </form>
  );
}

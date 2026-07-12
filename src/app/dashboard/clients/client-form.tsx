"use client";

import { useActionState, useEffect, useRef } from "react";
import { createClient, type ClientFormState } from "./actions";

const initial: ClientFormState = {};

export function ClientForm() {
  const [state, action, pending] = useActionState(createClient, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={action}
      className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-5 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end dark:border-neutral-800 dark:bg-neutral-900"
    >
      <Field label="Empresa" name="company" placeholder="Acme S.L." required />
      <Field label="Contacto" name="contactName" placeholder="María López" />
      <Field
        label="Email de facturación"
        name="billingEmail"
        type="email"
        placeholder="facturacion@acme.com"
        required
      />
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {pending ? "Guardando…" : "Añadir"}
      </button>

      {state.error && (
        <p
          role="alert"
          className="text-sm text-red-600 sm:col-span-full dark:text-red-400"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-neutral-500">{label}</span>
      <input
        {...props}
        className="h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-neutral-400 dark:focus:ring-neutral-400"
      />
    </label>
  );
}

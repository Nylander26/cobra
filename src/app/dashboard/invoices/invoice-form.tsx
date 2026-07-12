"use client";

import { useActionState, useEffect, useRef } from "react";
import { createInvoice, type InvoiceFormState } from "./actions";

const initial: InvoiceFormState = {};

type ClientOption = { id: string; company: string };

export function InvoiceForm({ clients }: { clients: ClientOption[] }) {
  const [state, action, pending] = useActionState(createInvoice, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={action}
      className="grid gap-4 rounded-xl border border-neutral-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <label className="block space-y-1 sm:col-span-2 lg:col-span-1">
        <span className="text-xs font-medium text-neutral-500">Cliente</span>
        <select
          name="clientId"
          required
          defaultValue=""
          className="h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50"
        >
          <option value="" disabled>
            Selecciona…
          </option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.company}
            </option>
          ))}
        </select>
      </label>

      <Field label="Nº de factura" name="number" placeholder="2026-014" required />
      <Field
        label="Importe (€)"
        name="amount"
        type="number"
        step="0.01"
        min="0"
        placeholder="800,00"
        required
      />
      <Field label="Fecha de emisión" name="issuedAt" type="date" required />
      <Field label="Vencimiento" name="dueAt" type="date" required />

      <div className="flex items-end">
        <button
          type="submit"
          disabled={pending}
          className="h-9 w-full rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {pending ? "Guardando…" : "Registrar factura"}
        </button>
      </div>

      {state.error && (
        <p
          role="alert"
          className="text-sm text-red-600 sm:col-span-2 lg:col-span-3 dark:text-red-400"
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

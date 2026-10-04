"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createInvoice, type InvoiceFormState } from "./actions";
import { NUEVO_CLIENTE } from "./nuevo-cliente";

const initial: InvoiceFormState = {};

type ClientOption = { id: string; company: string };

// Lo que el usuario ya calculó en la calculadora antes de registrarse: volver a
// teclearlo es fricción justo en el paso que activa la cuenta.
export type InvoiceDefaults = { amount?: string; dueAt?: string };

export function InvoiceForm({
  clients,
  defaults,
}: {
  clients: ClientOption[];
  defaults?: InvoiceDefaults;
}) {
  const [state, action, pending] = useActionState(createInvoice, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const sinClientes = clients.length === 0;
  const [clienteElegido, setClienteElegido] = useState(
    sinClientes ? NUEVO_CLIENTE : "",
  );
  const nuevoCliente = clienteElegido === NUEVO_CLIENTE;

  // Tras crear el cliente en línea, la página se revalida y ya aparece en el
  // selector: se vuelve a "Selecciona…" para no crear otro igual. Se ajusta en
  // render, comparando con el último resultado visto, y no en un efecto.
  const [ultimoResultado, setUltimoResultado] = useState(state);
  if (state !== ultimoResultado) {
    setUltimoResultado(state);
    if (state.ok) setClienteElegido("");
  }

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={action}
      className="grid gap-4 rounded-xl border border-neutral-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3 dark:border-neutral-800 dark:bg-neutral-900"
    >
      {sinClientes ? (
        <input type="hidden" name="clientId" value={NUEVO_CLIENTE} />
      ) : (
        <label className="block space-y-1 sm:col-span-2 lg:col-span-1">
          <span className="text-xs font-medium text-neutral-500">Cliente</span>
          <select
            name="clientId"
            required
            value={clienteElegido}
            onChange={(e) => setClienteElegido(e.target.value)}
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
            <option value={NUEVO_CLIENTE}>+ Cliente nuevo</option>
          </select>
        </label>
      )}

      {nuevoCliente && (
        <>
          <Field
            label="Cliente"
            name="company"
            placeholder="Acme S.L."
            required
          />
          <Field
            label="Email de facturación del cliente"
            name="billingEmail"
            type="email"
            placeholder="facturacion@acme.com"
            required
          />
        </>
      )}

      <Field label="Nº de factura" name="number" placeholder="2026-014" required />
      <Field
        label="Importe (€)"
        name="amount"
        type="number"
        step="0.01"
        min="0"
        placeholder="800,00"
        defaultValue={defaults?.amount}
        required
      />
      <Field label="Fecha de emisión" name="issuedAt" type="date" required />
      <Field
        label="Vencimiento"
        name="dueAt"
        type="date"
        defaultValue={defaults?.dueAt}
        required
      />

      <label className="block space-y-1 sm:col-span-2">
        <span className="text-xs font-medium text-neutral-500">
          PDF de la factura (opcional)
        </span>
        <input
          name="pdf"
          type="file"
          accept="application/pdf"
          className="block w-full text-sm text-neutral-600 file:mr-3 file:h-9 file:cursor-pointer file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-200 dark:text-neutral-400 dark:file:bg-neutral-800 dark:file:text-neutral-200 dark:hover:file:bg-neutral-700"
        />
      </label>

      <div className="flex items-end">
        <button
          type="submit"
          disabled={pending}
          className="h-9 w-full rounded-lg bg-cobra px-4 text-sm font-medium text-white transition hover:bg-cobra-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra disabled:opacity-50"
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

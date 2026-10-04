import { asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, invoices, leads } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { type InvoiceDefaults, InvoiceForm } from "./invoice-form";

// Dynamic: needs the user's clients to populate the form select. In <Suspense>.
// Sin clientes ya no se bloquea: el formulario los crea en línea.
export async function NewInvoice() {
  const { user } = await requireSession();

  const [rows, [{ facturas }]] = await Promise.all([
    db
      .select({ id: clients.id, company: clients.company })
      .from(clients)
      .where(eq(clients.userId, user.id))
      .orderBy(asc(clients.company)),
    db
      .select({ facturas: count() })
      .from(invoices)
      .where(eq(invoices.userId, user.id)),
  ]);

  return (
    <InvoiceForm
      clients={rows}
      defaults={facturas === 0 ? await defaultsDelLead(user.id) : undefined}
    />
  );
}

// Quien llega desde la calculadora ya dijo cuánto le deben y desde cuándo. Solo
// para la primera factura: después, rellenar con un impago viejo sería ruido.
async function defaultsDelLead(userId: string): Promise<InvoiceDefaults | undefined> {
  const [lead] = await db
    .select({ amountCents: leads.amountCents, dueDate: leads.dueDate })
    .from(leads)
    .where(eq(leads.userId, userId))
    .orderBy(desc(leads.updatedAt))
    .limit(1);
  if (!lead) return undefined;
  return {
    amount: lead.amountCents ? (lead.amountCents / 100).toFixed(2) : undefined,
    dueAt: lead.dueDate ? lead.dueDate.toISOString().slice(0, 10) : undefined,
  };
}

export function NewInvoiceFallback() {
  return (
    <div className="h-40 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-900" />
  );
}

import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, invoices } from "@/db/schema";
import { formatCents } from "@/lib/money";
import { requireSession } from "@/lib/session";
import { deleteInvoice, markInvoicePaid } from "./actions";

const dateFmt = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

type Display = "sent" | "overdue" | "paid" | "written_off" | "draft";

const badge: Record<Display, { label: string; className: string }> = {
  draft: { label: "Borrador", className: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300" },
  sent: { label: "Enviada", className: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  overdue: { label: "Vencida", className: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" },
  paid: { label: "Pagada", className: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" },
  written_off: { label: "Incobrable", className: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400" },
};

// Dynamic (session + request-time "now" to derive overdue), rendered in <Suspense>.
export async function InvoicesList() {
  const { user } = await requireSession();

  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      amountCents: invoices.amountCents,
      currency: invoices.currency,
      dueAt: invoices.dueAt,
      status: invoices.status,
      pdfUrl: invoices.pdfUrl,
      company: clients.company,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(eq(invoices.userId, user.id))
    .orderBy(desc(invoices.createdAt));

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
        Aún no has registrado facturas.
      </div>
    );
  }

  const now = Date.now();

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900">
          <tr>
            <th className="px-4 py-3 font-medium">Nº</th>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Importe</th>
            <th className="px-4 py-3 font-medium">Vencimiento</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
          {rows.map((invoice) => {
            const display: Display =
              invoice.status === "sent" && invoice.dueAt.getTime() < now
                ? "overdue"
                : (invoice.status as Display);
            const open =
              invoice.status !== "paid" && invoice.status !== "written_off";
            return (
              <tr key={invoice.id}>
                <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-50">
                  {invoice.number}
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                  {invoice.company}
                </td>
                <td className="px-4 py-3 text-neutral-900 dark:text-neutral-50">
                  {formatCents(invoice.amountCents, invoice.currency)}
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                  {dateFmt.format(invoice.dueAt)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge[display].className}`}
                  >
                    {badge[display].label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    {invoice.pdfUrl && (
                      <a
                        href={`/api/invoices/${invoice.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-neutral-500 transition hover:text-neutral-900 dark:hover:text-neutral-50"
                      >
                        PDF
                      </a>
                    )}
                    {open && (
                      <form action={markInvoicePaid}>
                        <input type="hidden" name="id" value={invoice.id} />
                        <button
                          type="submit"
                          className="text-xs font-medium text-green-700 transition hover:text-green-800 dark:text-green-400"
                        >
                          Marcar pagada
                        </button>
                      </form>
                    )}
                    <form action={deleteInvoice}>
                      <input type="hidden" name="id" value={invoice.id} />
                      <button
                        type="submit"
                        className="text-xs text-neutral-400 transition hover:text-red-600 dark:hover:text-red-400"
                      >
                        Eliminar
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function InvoicesListFallback() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-12 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
        />
      ))}
    </div>
  );
}

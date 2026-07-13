import { desc, eq } from "drizzle-orm";
import {
  IconCheck,
  IconDownload,
  IconTrash,
  IconUndo,
} from "@/components/icons";
import { db } from "@/db";
import { clients, invoices } from "@/db/schema";
import { computeLateInterest } from "@/lib/late-interest";
import { formatCents } from "@/lib/money";
import { requireSession } from "@/lib/session";
import { ActionButton } from "../action-button";
import { deleteInvoice, markInvoicePaid, unmarkInvoicePaid } from "./actions";

// Botones de acción de fila: misma forma y tamaño, hover con relleno suave.
// Al reposo solo la acción positiva lleva color; así hay jerarquía sin romper
// la alineación.
const rowAction =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-1";
const actionNeutral = `${rowAction} text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-neutral-400 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50`;
const actionPaid = `${rowAction} text-cobra hover:bg-cobra/10 focus-visible:outline-cobra dark:text-verde-claro dark:hover:bg-verde-claro/10`;
const actionDanger = `${rowAction} text-neutral-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-red-400 dark:text-neutral-500 dark:hover:bg-red-950 dark:hover:text-red-400`;

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
    <div className="animate-rise overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
      <table className="w-full min-w-[52rem] text-sm">
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
            const interes =
              display === "overdue"
                ? computeLateInterest(
                    invoice.amountCents,
                    invoice.dueAt,
                    new Date(now),
                  )
                : null;
            return (
              <tr key={invoice.id}>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-neutral-900 dark:text-neutral-50">
                  {invoice.number}
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                  {invoice.company}
                </td>
                <td className="px-4 py-3">
                  <div className="text-neutral-900 dark:text-neutral-50">
                    {formatCents(invoice.amountCents, invoice.currency)}
                  </div>
                  {interes && interes.interesCents > 0 && (
                    <div
                      className="text-xs text-amber-600 dark:text-amber-400"
                      title={`Interés de demora (Ley 3/2004): ${formatCents(interes.interesCents, invoice.currency)} en ${interes.dias} días · +${formatCents(interes.compensacionCents, invoice.currency)} de compensación por costes de cobro`}
                    >
                      +{formatCents(interes.interesCents, invoice.currency)}{" "}
                      demora
                    </div>
                  )}
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
                  <div className="flex items-center justify-end gap-1">
                    {invoice.pdfUrl && (
                      <a
                        href={`/api/invoices/${invoice.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={actionNeutral}
                      >
                        <IconDownload className="h-3.5 w-3.5" />
                        PDF
                      </a>
                    )}
                    {open ? (
                      <ActionButton
                        action={markInvoicePaid}
                        id={invoice.id}
                        className={actionPaid}
                        icon={<IconCheck className="h-3.5 w-3.5" />}
                        label="Marcar pagada"
                        confirm={{
                          title: "Marcar como pagada",
                          message: `¿Marcar la factura ${invoice.number} como pagada? Se detendrán sus recordatorios. Podrás revertirlo.`,
                          confirmLabel: "Marcar pagada",
                          tone: "primary",
                        }}
                      />
                    ) : invoice.status === "paid" ? (
                      <ActionButton
                        action={unmarkInvoicePaid}
                        id={invoice.id}
                        className={actionNeutral}
                        icon={<IconUndo className="h-3.5 w-3.5" />}
                        label="Marcar pendiente"
                        title="Revertir el estado pagada y reanudar los recordatorios"
                      />
                    ) : null}
                    <ActionButton
                      action={deleteInvoice}
                      id={invoice.id}
                      className={actionDanger}
                      icon={<IconTrash className="h-3.5 w-3.5" />}
                      label="Eliminar"
                      confirm={{
                        title: "Eliminar factura",
                        message: `¿Eliminar la factura ${invoice.number}? Esta acción no se puede deshacer.`,
                        confirmLabel: "Eliminar",
                        tone: "danger",
                      }}
                    />
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

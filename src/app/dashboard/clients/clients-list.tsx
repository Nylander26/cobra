import { desc, eq } from "drizzle-orm";
import { IconTrash } from "@/components/icons";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { ActionButton } from "../action-button";
import { deleteClient } from "./actions";

const actionDanger =
  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-400 dark:text-neutral-500 dark:hover:bg-red-950 dark:hover:text-red-400";

// Dynamic: reads session (headers) + queries the user's clients. Rendered
// inside a <Suspense> boundary so the page shell and the form stay static.
export async function ClientsList() {
  const { user } = await requireSession();

  const rows = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, user.id))
    .orderBy(desc(clients.createdAt));

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
        Aún no tienes clientes. Añade el primero arriba.
      </div>
    );
  }

  return (
    <div className="animate-rise overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900">
          <tr>
            <th className="px-4 py-3 font-medium">Empresa</th>
            <th className="px-4 py-3 font-medium">Contacto</th>
            <th className="px-4 py-3 font-medium">Email de facturación</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
          {rows.map((client) => (
            <tr key={client.id}>
              <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-50">
                {client.company}
              </td>
              <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                {client.contactName ?? "—"}
              </td>
              <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                {client.billingEmail}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end">
                  <ActionButton
                    action={deleteClient}
                    id={client.id}
                    className={actionDanger}
                    icon={<IconTrash className="h-3.5 w-3.5" />}
                    label="Eliminar"
                    confirm={{
                      title: "Eliminar cliente",
                      message: `¿Eliminar a ${client.company}? Se borrarán también sus facturas y recordatorios. Esta acción no se puede deshacer.`,
                      confirmLabel: "Eliminar",
                      tone: "danger",
                    }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ClientsListFallback() {
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

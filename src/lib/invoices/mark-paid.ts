import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { events, invoices, reminders } from "@/db/schema";
import { newId } from "@/lib/ids";

// Núcleo de "marcar pagada", compartido por la acción del panel (sesión) y el
// magic-link del resumen semanal (token firmado). Detiene la secuencia
// borrando los recordatorios aún no enviados. Devuelve false si la factura no
// existe, no es del usuario o ya no estaba abierta (idempotente).
export async function markInvoicePaidCore(
  userId: string,
  invoiceId: string,
  via: "dashboard" | "magic_link",
): Promise<boolean> {
  const updated = await db
    .update(invoices)
    .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.userId, userId),
        // Solo facturas abiertas: repetir el click (o un enlace viejo) sobre
        // una ya pagada/incobrable no toca nada.
        inArray(invoices.status, ["sent", "draft"]),
      ),
    )
    .returning({ id: invoices.id });
  if (updated.length === 0) return false;

  await db
    .delete(reminders)
    .where(and(eq(reminders.invoiceId, invoiceId), isNull(reminders.sentAt)));

  await db.insert(events).values({
    id: newId("evt"),
    userId,
    type: "invoice_paid",
    invoiceId,
    payload: { via },
  });

  return true;
}

"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { clients, events, invoices, reminders } from "@/db/schema";
import { getPlanUsage } from "@/lib/billing";
import { getOrCreateDefaultSequenceSteps } from "@/lib/default-sequence";
import { markInvoicePaidCore } from "@/lib/invoices/mark-paid";
import { newId } from "@/lib/ids";
import { parseAmountToCents } from "@/lib/money";
import { requireSession } from "@/lib/session";
import {
  deletePdf,
  invoicePdfKey,
  isStorageConfigured,
  uploadPdf,
} from "@/lib/storage";

const MAX_PDF_BYTES = 10 * 1024 * 1024;

export type InvoiceFormState = { error?: string; ok?: boolean };

const DAY_MS = 24 * 60 * 60 * 1000;

export async function createInvoice(
  _prev: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  const { user } = await requireSession();

  const clientId = String(formData.get("clientId") ?? "");
  const number = String(formData.get("number") ?? "").trim();
  const amountCents = parseAmountToCents(String(formData.get("amount") ?? ""));
  const issuedRaw = String(formData.get("issuedAt") ?? "");
  const dueRaw = String(formData.get("dueAt") ?? "");

  if (!clientId) return { error: "Selecciona un cliente." };
  if (!number) return { error: "El número de factura es obligatorio." };
  if (amountCents === null || amountCents === 0)
    return { error: "Introduce un importe válido." };
  if (!issuedRaw || !dueRaw)
    return { error: "Indica las fechas de emisión y vencimiento." };

  const issuedAt = new Date(issuedRaw);
  const dueAt = new Date(dueRaw);
  if (Number.isNaN(issuedAt.getTime()) || Number.isNaN(dueAt.getTime()))
    return { error: "Fechas inválidas." };
  if (dueAt < issuedAt)
    return { error: "El vencimiento no puede ser anterior a la emisión." };

  // Client must belong to this user.
  const ownedClient = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, user.id)))
    .limit(1);
  if (ownedClient.length === 0) return { error: "Cliente no encontrado." };

  // Plan limit: a new invoice is created "sent" (active), so it counts.
  const usage = await getPlanUsage(user.id);
  if (!usage.canAdd) {
    return {
      error: `Has alcanzado el límite de ${usage.limit} facturas activas de tu plan. Marca alguna como pagada o mejora tu plan en Facturación.`,
    };
  }

  const invoiceId = newId("inv");

  // Optional PDF: validate + upload before inserting, so a failed upload
  // doesn't leave an invoice pointing at a missing object.
  let pdfKey: string | null = null;
  const pdf = formData.get("pdf");
  if (pdf instanceof File && pdf.size > 0) {
    if (!isStorageConfigured())
      return {
        error:
          "El almacenamiento de PDF no está configurado. Completa las variables S3 en .env.local.",
      };
    if (pdf.type !== "application/pdf")
      return { error: "El archivo debe ser un PDF." };
    if (pdf.size > MAX_PDF_BYTES)
      return { error: "El PDF no puede superar 10 MB." };

    pdfKey = invoicePdfKey(user.id, invoiceId);
    await uploadPdf(pdfKey, new Uint8Array(await pdf.arrayBuffer()));
  }

  const steps = await getOrCreateDefaultSequenceSteps(user.id);

  await db.insert(invoices).values({
    id: invoiceId,
    userId: user.id,
    clientId,
    number,
    amountCents,
    currency: "EUR",
    issuedAt,
    dueAt,
    status: "sent",
    sequenceId: null,
    pdfUrl: pdfKey,
  });

  // Materialize reminders up front (the cron only reads scheduled_at <= now
  // AND sent_at IS NULL). Skip steps already in the past at creation time so an
  // invoice added after some offsets don't fire retroactively — the invoice
  // still picks up any future steps (e.g. an overdue invoice keeps +7/+15).
  const now = Date.now();
  const dueReminders = steps
    .map((step) => ({
      id: newId("rem"),
      invoiceId,
      sequenceStepId: step.id,
      scheduledAt: new Date(dueAt.getTime() + step.offsetDays * DAY_MS),
    }))
    .filter((r) => r.scheduledAt.getTime() > now);

  if (dueReminders.length > 0) {
    await db.insert(reminders).values(dueReminders);
  }

  await db.insert(events).values({
    id: newId("evt"),
    userId: user.id,
    type: "invoice_created",
    invoiceId,
    payload: { scheduledReminders: dueReminders.length },
  });

  revalidatePath("/dashboard/invoices");
  return { ok: true };
}

export async function markInvoicePaid(id: string): Promise<void> {
  const { user } = await requireSession();
  if (!id) return;

  await markInvoicePaidCore(user.id, id, "dashboard");
  revalidatePath("/dashboard/invoices");
}

// Deshacer "marcar pagada" (para un miss-click): vuelve a 'sent', limpia
// paidAt y re-arma los recordatorios futuros que aún no existen (los ya
// enviados se conservan; no se duplican).
export async function unmarkInvoicePaid(id: string): Promise<void> {
  const { user } = await requireSession();
  if (!id) return;

  const rows = await db
    .select({ dueAt: invoices.dueAt, status: invoices.status })
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, user.id)))
    .limit(1);
  if (rows.length === 0 || rows[0].status !== "paid") return;
  const { dueAt } = rows[0];

  await db
    .update(invoices)
    .set({ status: "sent", paidAt: null, updatedAt: new Date() })
    .where(and(eq(invoices.id, id), eq(invoices.userId, user.id)));

  // Re-materializar los pasos futuros que no tengan ya un recordatorio.
  const steps = await getOrCreateDefaultSequenceSteps(user.id);
  const existing = await db
    .select({ stepId: reminders.sequenceStepId })
    .from(reminders)
    .where(eq(reminders.invoiceId, id));
  const has = new Set(existing.map((e) => e.stepId));

  const now = Date.now();
  const toArm = steps
    .map((step) => ({
      id: newId("rem"),
      invoiceId: id,
      sequenceStepId: step.id,
      scheduledAt: new Date(dueAt.getTime() + step.offsetDays * DAY_MS),
    }))
    .filter((r) => r.scheduledAt.getTime() > now && !has.has(r.sequenceStepId));
  if (toArm.length > 0) await db.insert(reminders).values(toArm);

  await db.insert(events).values({
    id: newId("evt"),
    userId: user.id,
    type: "invoice_unpaid",
    invoiceId: id,
  });

  revalidatePath("/dashboard/invoices");
}

export async function deleteInvoice(id: string): Promise<void> {
  const { user } = await requireSession();
  if (!id) return;

  // FK onDelete cascade removes the invoice's reminders. Capture the PDF key
  // first so we can clean up the object after the row is gone.
  const deleted = await db
    .delete(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, user.id)))
    .returning({ pdfUrl: invoices.pdfUrl });

  const pdfKey = deleted[0]?.pdfUrl;
  if (pdfKey) {
    // Best-effort: a leftover object is harmless, don't fail the delete over it.
    try {
      await deletePdf(pdfKey);
    } catch {}
  }

  revalidatePath("/dashboard/invoices");
}

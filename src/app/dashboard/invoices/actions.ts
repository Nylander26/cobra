"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { clients, events, invoices, reminders } from "@/db/schema";
import { getPlanUsage } from "@/lib/billing";
import { getOrCreateDefaultSequenceSteps } from "@/lib/default-sequence";
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

export async function markInvoicePaid(formData: FormData): Promise<void> {
  const { user } = await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const updated = await db
    .update(invoices)
    .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
    .where(and(eq(invoices.id, id), eq(invoices.userId, user.id)))
    .returning({ id: invoices.id });
  if (updated.length === 0) return;

  // Stop the sequence: drop reminders that haven't been sent yet.
  await db
    .delete(reminders)
    .where(and(eq(reminders.invoiceId, id), isNull(reminders.sentAt)));

  await db.insert(events).values({
    id: newId("evt"),
    userId: user.id,
    type: "invoice_paid",
    invoiceId: id,
  });

  revalidatePath("/dashboard/invoices");
}

export async function deleteInvoice(formData: FormData): Promise<void> {
  const { user } = await requireSession();
  const id = String(formData.get("id") ?? "");
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

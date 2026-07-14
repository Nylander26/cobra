import { and, eq, inArray, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  brands,
  clients,
  events,
  invoices,
  reminders,
  sequenceSteps,
  subscriptions,
  user,
} from "@/db/schema";
import { renderBrandedEmail } from "@/lib/email/html";
import { getTransport } from "@/lib/email/transport";
import { newId } from "@/lib/ids";
import { PLANS, type PlanId } from "@/lib/plans";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildReminderVars, renderTemplate } from "@/lib/templates";

// Base pública para las URLs absolutas de los correos (logo de marca).
const APP_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export type SendSummary = {
  transport: string;
  due: number;
  sent: number;
  failed: number;
  // Pospuestos por el tope diario del plan (se reintentan al día siguiente).
  capped: number;
};

// Sender identity (interim): reminders go out from Cobra's address carrying the
// freelancer's name, with reply-to set to the freelancer — until per-user domain
// verification lets us send truly "as" their domain. Exported so the email
// preview shows the same From address the real send will use.
export function fromEmail(): string {
  return process.env.REMINDER_FROM_EMAIL || "recordatorios@example.com";
}

// Processes every reminder that is due and unsent, for invoices still open.
// Marking paid deletes pending reminders, so paid invoices never appear here;
// the status filter is a second line of defence.
export async function sendDueReminders(now = new Date()): Promise<SendSummary> {
  const transport = getTransport();

  const rows = await db
    .select({
      reminderId: reminders.id,
      invoiceId: invoices.id,
      userId: invoices.userId,
      number: invoices.number,
      amountCents: invoices.amountCents,
      currency: invoices.currency,
      dueAt: invoices.dueAt,
      company: clients.company,
      contactName: clients.contactName,
      billingEmail: clients.billingEmail,
      subject: sequenceSteps.subject,
      body: sequenceSteps.body,
      senderName: user.senderName,
      userName: user.name,
      userEmail: user.email,
      brandId: brands.id,
      brandName: brands.name,
      brandSenderName: brands.senderName,
      brandReplyTo: brands.replyTo,
      brandSignature: brands.signature,
      brandLogoUrl: brands.logoUrl,
      brandHtmlEmails: brands.htmlEmails,
      plan: subscriptions.plan,
    })
    .from(reminders)
    .innerJoin(invoices, eq(reminders.invoiceId, invoices.id))
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .innerJoin(sequenceSteps, eq(reminders.sequenceStepId, sequenceSteps.id))
    .innerJoin(user, eq(invoices.userId, user.id))
    .leftJoin(brands, eq(clients.brandId, brands.id))
    .leftJoin(subscriptions, eq(subscriptions.userId, invoices.userId))
    .where(
      and(
        lte(reminders.scheduledAt, now),
        isNull(reminders.sentAt),
        eq(invoices.status, "sent"),
      ),
    )
    .limit(200);

  // Clientes sin marca explícita resuelven a la marca por defecto del usuario
  // (una consulta para todo el lote). Usuarios sin marca por defecto todavía
  // caen al remitente legado (user.senderName / user.name / user.email).
  const withoutBrand = [
    ...new Set(rows.filter((r) => r.brandName === null).map((r) => r.userId)),
  ];
  const defaultBrands = new Map<
    string,
    typeof brands.$inferSelect
  >();
  if (withoutBrand.length > 0) {
    const defaults = await db
      .select()
      .from(brands)
      .where(
        and(inArray(brands.userId, withoutBrand), eq(brands.isDefault, true)),
      );
    for (const b of defaults) defaultBrands.set(b.userId, b);
  }

  let sent = 0;
  let failed = 0;
  let capped = 0;

  for (const row of rows) {
    // Red anti-spam: tope diario de envíos por usuario según su plan. Al
    // tope, el recordatorio se pospone (sent_at queda null y el próximo run
    // lo reintenta, ya con la ventana renovada).
    const plan: PlanId = row.plan ?? "free";
    const cap = PLANS[plan].dailySendCap;
    const allowed = await checkRateLimit(`send:${row.userId}`, {
      max: cap,
      windowSeconds: 24 * 60 * 60,
    });
    if (!allowed) {
      capped++;
      await db.insert(events).values({
        id: newId("evt"),
        userId: row.userId,
        type: "reminder_capped",
        invoiceId: row.invoiceId,
        reminderId: row.reminderId,
        payload: { plan, cap },
      });
      continue;
    }

    // Remitente efectivo: la marca del cliente (o la por defecto del usuario)
    // manda; sin marca, el remitente legado del usuario.
    const brand =
      row.brandName !== null
        ? {
            id: row.brandId as string,
            name: row.brandName,
            senderName: row.brandSenderName,
            replyTo: row.brandReplyTo,
            signature: row.brandSignature,
            logoUrl: row.brandLogoUrl,
            htmlEmails: row.brandHtmlEmails ?? false,
          }
        : (defaultBrands.get(row.userId) ?? null);

    const fromName = brand
      ? brand.senderName || brand.name
      : row.senderName || row.userName;
    const replyTo = brand?.replyTo || row.userEmail;
    const signature = brand?.signature ?? null;

    const vars = buildReminderVars({
      invoice: {
        number: row.number,
        amountCents: row.amountCents,
        currency: row.currency,
        dueAt: row.dueAt,
      },
      client: { company: row.company, contactName: row.contactName },
      sender: {
        name: row.userName,
        senderName: fromName,
        signature,
      },
      now: now.getTime(),
    });

    const from = `${fromName} <${fromEmail()}>`;
    const text = renderTemplate(row.body, vars);

    // HTML solo si la marca lo activó (Estudio); el texto plano va siempre.
    const html = brand?.htmlEmails
      ? renderBrandedEmail({
          bodyText: text,
          brandName: brand.name,
          logoUrl: brand.logoUrl
            ? `${APP_URL}/api/brands/${brand.id}/logo`
            : null,
          // Datos de la factura (no del cuerpo, siempre correctos aunque el
          // usuario reescriba la plantilla) para el bloque de referencia.
          reference: {
            numero: vars.numero,
            vencimiento: vars.vencimiento,
            importe: vars.importe,
          },
        })
      : undefined;

    try {
      const { id } = await transport.send({
        to: row.billingEmail,
        from,
        replyTo,
        subject: renderTemplate(row.subject, vars),
        text,
        html,
      });

      await db
        .update(reminders)
        .set({ sentAt: now })
        .where(eq(reminders.id, row.reminderId));

      await db.insert(events).values({
        id: newId("evt"),
        userId: row.userId,
        type: "reminder_sent",
        invoiceId: row.invoiceId,
        reminderId: row.reminderId,
        payload: { transport: transport.name, messageId: id },
      });
      sent++;
    } catch (err) {
      // Leave sent_at null so the next run retries; record why.
      await db.insert(events).values({
        id: newId("evt"),
        userId: row.userId,
        type: "reminder_failed",
        invoiceId: row.invoiceId,
        reminderId: row.reminderId,
        payload: { transport: transport.name, error: String(err) },
      });
      failed++;
    }
  }

  return { transport: transport.name, due: rows.length, sent, failed, capped };
}

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, events, invoices, user } from "@/db/schema";
import {
  escapeHtml,
  renderCobraEmail,
} from "@/lib/email/cobra-template";
import { getTransport } from "@/lib/email/transport";
import { newId } from "@/lib/ids";
import { createMarkPaidToken } from "@/lib/magic-link";
import { formatCents } from "@/lib/money";

const APP_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const DAY_MS = 24 * 60 * 60 * 1000;

export type DigestSummary = {
  transport: string;
  users: number;
  sent: number;
  failed: number;
};

const dateFmt = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// Resumen semanal al autónomo: sus facturas abiertas con un magic-link por
// factura para marcarla pagada sin entrar al panel. Solo reciben correo los
// usuarios con al menos una factura en seguimiento.
export async function sendWeeklyDigests(now = new Date()): Promise<DigestSummary> {
  const transport = getTransport();

  const rows = await db
    .select({
      userId: invoices.userId,
      userName: user.name,
      userEmail: user.email,
      invoiceId: invoices.id,
      number: invoices.number,
      amountCents: invoices.amountCents,
      currency: invoices.currency,
      dueAt: invoices.dueAt,
      company: clients.company,
    })
    .from(invoices)
    .innerJoin(user, eq(invoices.userId, user.id))
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(eq(invoices.status, "sent"))
    .orderBy(invoices.dueAt);

  const byUser = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byUser.get(row.userId);
    if (list) list.push(row);
    else byUser.set(row.userId, [row]);
  }

  let sent = 0;
  let failed = 0;

  for (const [userId, list] of byUser) {
    const total = list.reduce((sum, r) => sum + r.amountCents, 0);
    const n = list.length;

    const items = list.map((r) => {
      const daysOverdue = Math.floor((now.getTime() - r.dueAt.getTime()) / DAY_MS);
      const when =
        daysOverdue > 0
          ? `venció el ${dateFmt.format(r.dueAt)} (${daysOverdue} ${daysOverdue === 1 ? "día" : "días"} de retraso)`
          : `vence el ${dateFmt.format(r.dueAt)}`;
      const token = createMarkPaidToken(
        { invoiceId: r.invoiceId, userId },
        now.getTime(),
      );
      return { ...r, when, overdue: daysOverdue > 0, url: `${APP_URL}/pagada/${token}` };
    });

    const lines = items.map(
      (r) => `• ${r.number} — ${r.company} — ${formatCents(r.amountCents, r.currency)} — ${r.when}
  ¿Cobrada? Márcala pagada: ${r.url}`,
    );

    const text = `Hola ${list[0].userName},

Tienes ${n === 1 ? "1 factura pendiente" : `${n} facturas pendientes`} de cobro por ${formatCents(total)}:

${lines.join("\n\n")}

Cobra sigue recordándoselas a tus clientes automáticamente. Gestiona todo en ${APP_URL}/dashboard.

— Cobra
`;

    // Bloque HTML del resumen: cifra grande estilo landing (label mono +
    // serif) y una fila por factura con divisor; ámbar solo si hay demora.
    const rows = items
      .map(
        (r) => `<tr>
  <td style="padding:14px 12px 14px 0; border-top:1px solid #DEE3DA;">
    <div style="font-family:'Courier New', Courier, monospace; font-size:12px; color:#8FA89A;">${escapeHtml(r.number)}</div>
    <div style="margin-top:2px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; font-size:15px; color:#24322B;">${escapeHtml(r.company)}</div>
    <div style="margin-top:2px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; font-size:13px; color:${r.overdue ? "#A9781F" : "#8FA89A"};">${escapeHtml(r.when)}</div>
    <a href="${escapeHtml(r.url)}" target="_blank" style="display:inline-block; margin-top:6px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; font-size:13px; font-weight:600; color:#196C4C; text-decoration:none;">¿Cobrada? Márcala pagada &rarr;</a>
  </td>
  <td align="right" valign="top" style="padding:14px 0 14px 12px; border-top:1px solid #DEE3DA; white-space:nowrap;">
    <span style="font-family:Georgia, 'Times New Roman', serif; font-size:18px; color:#12241C;">${escapeHtml(formatCents(r.amountCents, r.currency))}</span>
  </td>
</tr>`,
      )
      .join("\n");

    const blockHtml = `<div style="margin:4px 0 2px; font-family:'Courier New', Courier, monospace; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#8FA89A;">Pendiente de cobro</div>
<div style="margin:0 0 14px; font-family:Georgia, 'Times New Roman', serif; font-size:34px; line-height:1.15; color:#12241C;">${escapeHtml(formatCents(total))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${rows}
</table>`;

    try {
      await transport.send({
        to: list[0].userEmail,
        from: "Cobra <soporte@micobra.es>",
        subject: `Resumen de cobros: ${n === 1 ? "1 factura pendiente" : `${n} facturas pendientes`} (${formatCents(total)})`,
        text,
        html: renderCobraEmail({
          preheader: `${formatCents(total)} pendientes de cobro. Cobra sigue reclamando por ti.`,
          eyebrow: "Tu resumen semanal",
          heading:
            n === 1
              ? "Tienes 1 factura pendiente"
              : `Tienes ${n} facturas pendientes`,
          blockHtml,
          cta: { label: "Abrir mi panel", url: `${APP_URL}/dashboard` },
          footer:
            "Recibes este resumen los lunes porque tienes facturas en seguimiento en Cobra. Cuando todo esté cobrado, dejará de llegar solo.",
        }),
      });
      await db.insert(events).values({
        id: newId("evt"),
        userId,
        type: "digest_sent",
        payload: { invoices: n, totalCents: total },
      });
      sent++;
    } catch {
      failed++;
    }
  }

  return { transport: transport.name, users: byUser.size, sent, failed };
}

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, events, invoices, user } from "@/db/schema";
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

    const lines = list.map((r) => {
      const daysOverdue = Math.floor((now.getTime() - r.dueAt.getTime()) / DAY_MS);
      const when =
        daysOverdue > 0
          ? `venció el ${dateFmt.format(r.dueAt)} (${daysOverdue} ${daysOverdue === 1 ? "día" : "días"} de retraso)`
          : `vence el ${dateFmt.format(r.dueAt)}`;
      const token = createMarkPaidToken(
        { invoiceId: r.invoiceId, userId },
        now.getTime(),
      );
      return `• ${r.number} — ${r.company} — ${formatCents(r.amountCents, r.currency)} — ${when}
  ¿Cobrada? Márcala pagada: ${APP_URL}/pagada/${token}`;
    });

    const text = `Hola ${list[0].userName},

Tienes ${n === 1 ? "1 factura pendiente" : `${n} facturas pendientes`} de cobro por ${formatCents(total)}:

${lines.join("\n\n")}

Cobra sigue recordándoselas a tus clientes automáticamente. Gestiona todo en ${APP_URL}/dashboard.

— Cobra
`;

    try {
      await transport.send({
        to: list[0].userEmail,
        from: "Cobra <soporte@micobra.es>",
        subject: `Resumen de cobros: ${n === 1 ? "1 factura pendiente" : `${n} facturas pendientes`} (${formatCents(total)})`,
        text,
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

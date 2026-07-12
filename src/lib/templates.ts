import { formatCents } from "@/lib/money";

const DAY_MS = 24 * 60 * 60 * 1000;

const dateFmt = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// Replaces {{variable}} (with optional inner spaces) from the vars map.
// Unknown variables collapse to empty string rather than leaking "{{x}}".
export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? "");
}

export type ReminderContext = {
  invoice: {
    number: string;
    amountCents: number;
    currency: string;
    dueAt: Date;
  };
  client: { company: string; contactName: string | null };
  sender: { name: string; senderName: string | null; signature: string | null };
  now: number;
};

export function buildReminderVars(ctx: ReminderContext): Record<string, string> {
  const overdueDays = Math.max(
    0,
    Math.floor((ctx.now - ctx.invoice.dueAt.getTime()) / DAY_MS),
  );

  return {
    cliente: ctx.client.contactName || ctx.client.company,
    numero: ctx.invoice.number,
    importe: formatCents(ctx.invoice.amountCents, ctx.invoice.currency),
    vencimiento: dateFmt.format(ctx.invoice.dueAt),
    dias_retraso: String(overdueDays),
    remitente: ctx.sender.senderName || ctx.sender.name,
    firma: ctx.sender.signature || "",
  };
}

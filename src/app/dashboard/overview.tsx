import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { CobraMark } from "@/components/logo";
import { db } from "@/db";
import { clients, events, invoices } from "@/db/schema";
import { formatCents } from "@/lib/money";
import { requireSession } from "@/lib/session";

const DAY_MS = 24 * 60 * 60 * 1000;

type Bucket = { amount: number; count: number };
const empty = (): Bucket => ({ amount: 0, count: 0 });

// Dynamic: session + request-time "now" for aging. Rendered in <Suspense>.
export async function Overview() {
  const { user } = await requireSession();

  const [unpaid, [{ remindersSent }], [{ clientsTotal }], [{ invoicesTotal }]] =
    await Promise.all([
      db
        .select({ amountCents: invoices.amountCents, dueAt: invoices.dueAt })
        .from(invoices)
        .where(and(eq(invoices.userId, user.id), eq(invoices.status, "sent"))),
      db
        .select({ remindersSent: count() })
        .from(events)
        .where(
          and(eq(events.userId, user.id), eq(events.type, "reminder_sent")),
        ),
      db
        .select({ clientsTotal: count() })
        .from(clients)
        .where(eq(clients.userId, user.id)),
      db
        .select({ invoicesTotal: count() })
        .from(invoices)
        .where(eq(invoices.userId, user.id)),
    ]);

  // Usuario recién llegado: nada de tarjetas a cero — una bienvenida con los
  // dos pasos que le faltan, marcando el primero si ya tiene clientes.
  if (invoicesTotal === 0) {
    const hasClients = clientsTotal > 0;
    return (
      <div className="max-w-xl rounded-xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
        <CobraMark className="h-8 w-8 text-cobra" />
        <h2 className="mt-4 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
          Bienvenido a Cobra
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Dos pasos y tus facturas se reclaman solas.
        </p>
        <ol className="mt-6 space-y-4">
          <li className="flex gap-3">
            <span className="font-mono text-sm text-cobra">
              {hasClients ? "✓" : "1"}
            </span>
            <div>
              <p
                className={`text-sm font-medium ${
                  hasClients
                    ? "text-neutral-400 line-through dark:text-neutral-500"
                    : "text-neutral-900 dark:text-neutral-50"
                }`}
              >
                Añade tu primer cliente
              </p>
              <p className="text-sm text-neutral-500">
                Solo su nombre y su email.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-sm text-cobra">2</span>
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                Registra su factura
              </p>
              <p className="text-sm text-neutral-500">
                Importe y vencimiento. Cobra programa los recordatorios en ese
                momento y no para hasta que la marques pagada.
              </p>
            </div>
          </li>
        </ol>
        <Link
          href={hasClients ? "/dashboard/invoices" : "/dashboard/clients"}
          className="mt-7 inline-block rounded-lg bg-cobra px-5 py-2.5 text-sm font-medium text-white transition hover:bg-cobra-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra"
        >
          {hasClients ? "Registrar mi primera factura" : "Añadir mi primer cliente"}
        </Link>
      </div>
    );
  }

  const now = Date.now();
  const upcoming = empty();
  const d0_30 = empty();
  const d30_60 = empty();
  const d60 = empty();
  let pendingTotal = 0;
  let overdueTotal = 0;

  for (const inv of unpaid) {
    pendingTotal += inv.amountCents;
    const daysOverdue = Math.floor((now - inv.dueAt.getTime()) / DAY_MS);
    let bucket: Bucket;
    if (daysOverdue < 0) {
      bucket = upcoming;
    } else {
      overdueTotal += inv.amountCents;
      bucket = daysOverdue <= 30 ? d0_30 : daysOverdue <= 60 ? d30_60 : d60;
    }
    bucket.amount += inv.amountCents;
    bucket.count += 1;
  }

  const stats = [
    { label: "Pendiente de cobro", value: formatCents(pendingTotal) },
    { label: "Vencido", value: formatCents(overdueTotal), warn: overdueTotal > 0 },
    { label: "Recordatorios enviados", value: String(remindersSent) },
  ];

  const aging = [
    { label: "Por vencer", bucket: upcoming, tone: "neutral" as const },
    { label: "0–30 días", bucket: d0_30, tone: "warn" as const },
    { label: "30–60 días", bucket: d30_60, tone: "warn" as const },
    { label: "+60 días", bucket: d60, tone: "bad" as const },
  ];

  const toneClass = {
    neutral: "text-neutral-900 dark:text-neutral-50",
    warn: "text-amber-600 dark:text-amber-400",
    bad: "text-red-600 dark:text-red-400",
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <p className="text-sm text-neutral-500">{stat.label}</p>
            <p
              className={`mt-2 text-2xl font-semibold ${
                stat.warn
                  ? "text-red-600 dark:text-red-400"
                  : "text-neutral-900 dark:text-neutral-50"
              }`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-neutral-500">
          Aging del pendiente de cobro
        </h2>
        <div className="grid gap-4 sm:grid-cols-4">
          {aging.map((a) => (
            <div
              key={a.label}
              className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <p className="text-xs text-neutral-500">{a.label}</p>
              <p
                className={`mt-1 text-lg font-semibold ${
                  // El color de alarma solo cuando hay importe: un 0,00 € en
                  // rojo es señal sin información.
                  a.bucket.amount > 0 ? toneClass[a.tone] : toneClass.neutral
                }`}
              >
                {formatCents(a.bucket.amount)}
              </p>
              <p className="text-xs text-neutral-400">
                {a.bucket.count}{" "}
                {a.bucket.count === 1 ? "factura" : "facturas"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {unpaid.length === 0 && (
        <p className="text-sm text-neutral-400">
          Todo cobrado: no tienes facturas pendientes. Puedes registrar la
          siguiente en{" "}
          <Link
            href="/dashboard/invoices"
            className="underline underline-offset-4"
          >
            Facturas
          </Link>
          .
        </p>
      )}
    </div>
  );
}

export function OverviewFallback() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-900"
          />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-900"
          />
        ))}
      </div>
    </div>
  );
}

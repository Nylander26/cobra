import Link from "next/link";
import { Suspense } from "react";
import { and, eq } from "drizzle-orm";
import { CobraMark } from "@/components/logo";
import { db } from "@/db";
import { clients, invoices } from "@/db/schema";
import { formatCents } from "@/lib/money";
import { verifyMarkPaidToken } from "@/lib/magic-link";
import { confirmMarkPaid } from "./actions";

// Página pública del magic-link del resumen semanal. El GET solo muestra la
// confirmación — marcar pagada exige el POST del botón (los escáneres de
// email prefetchean los enlaces y no deben mutar nada).
export default function PagadaPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-papel px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-tinta"
            aria-label="Cobra — inicio"
          >
            <CobraMark className="h-7 w-7" />
            <span className="font-display text-2xl">Cobra</span>
          </Link>
        </div>
        <Suspense fallback={<CardShell title="Comprobando el enlace…" />}>
          <PagadaCard params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

function CardShell({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="animate-rise space-y-3 rounded-2xl border border-linea bg-white p-6 shadow-[0_1px_2px_rgba(18,36,28,0.06)]">
      <h1 className="text-lg font-semibold text-tinta">{title}</h1>
      {children}
    </div>
  );
}

const dateFmt = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

async function PagadaCard({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const [{ token }, { ok }] = await Promise.all([params, searchParams]);
  const payload = verifyMarkPaidToken(token, Date.now());

  if (!payload) {
    return (
      <CardShell title="Este enlace no es válido">
        <p className="text-sm text-grafito">
          El enlace ha caducado o está incompleto. Puedes marcar la factura
          desde el panel.
        </p>
        <DashboardLink />
      </CardShell>
    );
  }

  const [row] = await db
    .select({
      number: invoices.number,
      amountCents: invoices.amountCents,
      currency: invoices.currency,
      dueAt: invoices.dueAt,
      status: invoices.status,
      paidAt: invoices.paidAt,
      company: clients.company,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(
      and(
        eq(invoices.id, payload.invoiceId),
        eq(invoices.userId, payload.userId),
      ),
    )
    .limit(1);

  if (!row) {
    return (
      <CardShell title="Factura no encontrada">
        <p className="text-sm text-grafito">
          Puede que la hayas eliminado. Revisa tus facturas en el panel.
        </p>
        <DashboardLink />
      </CardShell>
    );
  }

  if (row.status === "paid") {
    return (
      <CardShell
        title={ok ? "Factura marcada como pagada" : "Ya estaba pagada"}
      >
        <p className="text-sm text-grafito">
          La factura <span className="font-medium text-tinta">{row.number}</span>{" "}
          de {row.company}
          {row.paidAt
            ? ` figura pagada desde el ${dateFmt.format(row.paidAt)}.`
            : " figura como pagada."}{" "}
          Sus recordatorios están detenidos.
        </p>
        {ok && (
          <p className="text-sm text-grafito/60">
            ¿Ha sido un error? Puedes revertirlo desde el panel.
          </p>
        )}
        <DashboardLink />
      </CardShell>
    );
  }

  return (
    <CardShell title="¿Marcar como pagada?">
      <dl className="space-y-1.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-grafito/60">Factura</dt>
          <dd className="font-medium text-tinta">{row.number}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-grafito/60">Cliente</dt>
          <dd className="text-tinta">{row.company}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-grafito/60">Importe</dt>
          <dd className="font-medium text-tinta">
            {formatCents(row.amountCents, row.currency)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-grafito/60">Vencimiento</dt>
          <dd className="text-tinta">{dateFmt.format(row.dueAt)}</dd>
        </div>
      </dl>
      <form action={confirmMarkPaid} className="space-y-2 pt-1">
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          className="w-full rounded-lg bg-cobra px-4 py-2 text-sm font-medium text-white transition hover:bg-cobra-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra"
        >
          Sí, marcar como pagada
        </button>
        <p className="text-center text-xs text-grafito/60">
          Se detendrán sus recordatorios. Podrás revertirlo desde el panel.
        </p>
      </form>
    </CardShell>
  );
}

function DashboardLink() {
  return (
    <Link
      href="/dashboard/invoices"
      className="inline-block w-full rounded-lg bg-cobra px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-cobra-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra"
    >
      Ir a mis facturas
    </Link>
  );
}

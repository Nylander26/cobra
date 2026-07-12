import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { InvoiceForm } from "./invoice-form";

// Dynamic: needs the user's clients to populate the form select. In <Suspense>.
export async function NewInvoice() {
  const { user } = await requireSession();

  const rows = await db
    .select({ id: clients.id, company: clients.company })
    .from(clients)
    .where(eq(clients.userId, user.id))
    .orderBy(asc(clients.company));

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
        Primero añade un{" "}
        <Link href="/dashboard/clients" className="underline underline-offset-4">
          cliente
        </Link>{" "}
        para poder registrar facturas.
      </div>
    );
  }

  return <InvoiceForm clients={rows} />;
}

export function NewInvoiceFallback() {
  return (
    <div className="h-40 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-900" />
  );
}

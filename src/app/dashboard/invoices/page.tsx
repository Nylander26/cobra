import { Suspense } from "react";
import { InvoicesList, InvoicesListFallback } from "./invoices-list";
import { NewInvoice, NewInvoiceFallback } from "./new-invoice";

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Facturas
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Al registrar una factura, Cobra programa los recordatorios de su
          secuencia automáticamente.
        </p>
      </div>

      <Suspense fallback={<NewInvoiceFallback />}>
        <NewInvoice />
      </Suspense>

      <Suspense fallback={<InvoicesListFallback />}>
        <InvoicesList />
      </Suspense>
    </div>
  );
}

import { Suspense } from "react";
import { BillingPanel, BillingPanelFallback } from "./billing-panel";

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Facturación
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Tu plan y uso. Mejora cuando necesites seguir más facturas.
        </p>
      </div>

      <Suspense fallback={<BillingPanelFallback />}>
        <BillingPanel />
      </Suspense>
    </div>
  );
}

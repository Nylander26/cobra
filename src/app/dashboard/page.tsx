import { Suspense } from "react";
import { Overview, OverviewFallback } from "./overview";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Resumen
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Pendiente de cobro y aging de tus facturas.
        </p>
      </div>

      <Suspense fallback={<OverviewFallback />}>
        <Overview />
      </Suspense>
    </div>
  );
}

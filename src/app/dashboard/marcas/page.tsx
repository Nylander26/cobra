import { Suspense } from "react";
import { BrandsSection, BrandsSectionFallback } from "./brands-section";

export default function BrandsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Marcas
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          El remitente de tus recordatorios: con qué nombre, email de
          respuesta y firma llegan a tus clientes.
        </p>
      </div>

      <Suspense fallback={<BrandsSectionFallback />}>
        <BrandsSection />
      </Suspense>
    </div>
  );
}

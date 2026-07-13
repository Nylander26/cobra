import { Suspense } from "react";
import { BrandSelect } from "./brand-select";
import { ClientForm } from "./client-form";
import { ClientsList, ClientsListFallback } from "./clients-list";

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Clientes
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Los clientes a los que emites facturas.
        </p>
      </div>

      {/* fallback null deliberado: el selector solo existe para Estudio con
          varias marcas; para el resto no hay contenido que reservar. */}
      <ClientForm
        brandSelector={
          <Suspense fallback={null}>
            <BrandSelect />
          </Suspense>
        }
      />

      <Suspense fallback={<ClientsListFallback />}>
        <ClientsList />
      </Suspense>
    </div>
  );
}

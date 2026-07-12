export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Facturas
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Registra tus facturas y Cobra programará los recordatorios.
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
        Próximamente: alta de facturas, subida de PDF y estados.
      </div>
    </div>
  );
}

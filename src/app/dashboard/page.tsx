export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Resumen
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Aquí verás el pendiente de cobro y el aging de tus facturas.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Pendiente de cobro", value: "—" },
          { label: "Facturas vencidas", value: "—" },
          { label: "Recordatorios enviados", value: "—" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <p className="text-sm text-neutral-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <p className="text-sm text-neutral-400">
        Empieza dando de alta tus{" "}
        <a
          href="/dashboard/clients"
          className="underline underline-offset-4"
        >
          clientes
        </a>
        .
      </p>
    </div>
  );
}

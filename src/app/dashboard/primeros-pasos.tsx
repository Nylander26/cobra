import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, emailDomains, invoices } from "@/db/schema";
import { requireSession } from "@/lib/session";

// Puesta en marcha guiada. No es un tour con burbujas encima de la interfaz:
// es una lista de lo que falta, con el enlace que lleva a hacerlo. Sobrevive a
// recargar la página y a volver mañana, que es justo cuando un tour ya se ha
// perdido.
//
// El paso del dominio es el que más cuesta y el que decide si el producto
// funciona: sin dominio verificado los recordatorios salen desde una dirección
// prestada y acaban en spam. Por eso va antes que la primera factura aunque se
// pueda facturar sin él.
//
// Server component: cuatro `count` contra índices ya existentes. Va en su
// propio <Suspense> porque lee la sesión.

type Paso = {
  titulo: string;
  texto: string;
  href: string;
  cta: string;
  hecho: boolean;
};

function Marca({ hecho }: { hecho: boolean }) {
  if (hecho) {
    return (
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-cobra text-[11px] font-semibold text-white"
      >
        ✓
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 size-5 shrink-0 rounded-full border border-neutral-300 dark:border-neutral-700"
    />
  );
}

export async function PrimerosPasos() {
  const { user } = await requireSession();

  const [[{ dominios }], [{ clientesTotal }], [{ facturasTotal }]] =
    await Promise.all([
      db
        .select({ dominios: count() })
        .from(emailDomains)
        .where(
          and(
            eq(emailDomains.userId, user.id),
            eq(emailDomains.status, "verified"),
          ),
        ),
      db
        .select({ clientesTotal: count() })
        .from(clients)
        .where(eq(clients.userId, user.id)),
      db
        .select({ facturasTotal: count() })
        .from(invoices)
        .where(eq(invoices.userId, user.id)),
    ]);

  const pasos: Paso[] = [
    {
      titulo: "Confirma tu email",
      texto:
        "Ya está: es lo que hiciste al activar la cuenta desde el enlace del correo.",
      href: "/dashboard/soporte",
      cta: "Reenviar el correo",
      hecho: user.emailVerified,
    },
    {
      titulo: "Verifica tu dominio de envío",
      texto:
        "Tres registros DNS. Los recordatorios salen desde tu propia dirección y llegan a la bandeja de entrada, no a spam.",
      href: "/dashboard/marcas",
      cta: "Verificar mi dominio",
      hecho: dominios > 0,
    },
    {
      titulo: "Añade tu primer cliente",
      texto: "Solo su nombre y el email al que le mandas las facturas.",
      href: "/dashboard/clients",
      cta: "Añadir cliente",
      hecho: clientesTotal > 0,
    },
    {
      titulo: "Registra tu primera factura",
      texto:
        "Importe y vencimiento. Cobra programa los recordatorios en ese mismo momento y no para hasta que la marques pagada.",
      href: "/dashboard/invoices",
      cta: "Registrar factura",
      hecho: facturasTotal > 0,
    },
  ];

  const hechos = pasos.filter((p) => p.hecho).length;
  // Completada la puesta en marcha, la tarjeta desaparece para siempre: no hay
  // que descartarla a mano ni guardar ese descarte en ningún sitio.
  if (hechos === pasos.length) return null;

  const siguiente = pasos.find((p) => !p.hecho);

  return (
    // <details> y no un desplegable en cliente: el estado abierto/cerrado lo
    // lleva el navegador, así que esto no arrastra JavaScript al dashboard.
    <details
      open
      className="animate-rise group rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Primeros pasos
          </h2>
          <p className="mt-0.5 text-sm text-neutral-500">
            {siguiente
              ? `Te falta: ${siguiente.titulo.toLowerCase()}.`
              : "Ya casi está."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="font-mono text-xs text-neutral-500">
            {hechos} de {pasos.length}
          </span>
          <div
            className="h-1 w-16 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
            role="progressbar"
            aria-valuenow={hechos}
            aria-valuemin={0}
            aria-valuemax={pasos.length}
            aria-label="Progreso de la puesta en marcha"
          >
            <div
              className="h-full rounded-full bg-cobra"
              style={{ width: `${(hechos / pasos.length) * 100}%` }}
            />
          </div>
          <span
            aria-hidden="true"
            className="text-neutral-400 transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </div>
      </summary>

      <ol className="space-y-4 border-t border-neutral-200 p-5 dark:border-neutral-800">
        {pasos.map((paso) => (
          <li key={paso.titulo} className="flex gap-3">
            <Marca hecho={paso.hecho} />
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-medium ${
                  paso.hecho
                    ? "text-neutral-400 line-through dark:text-neutral-500"
                    : "text-neutral-900 dark:text-neutral-50"
                }`}
              >
                {paso.titulo}
              </p>
              {!paso.hecho && (
                <>
                  <p className="mt-0.5 text-sm text-neutral-500">{paso.texto}</p>
                  <Link
                    href={paso.href}
                    className="mt-2 inline-block rounded-lg px-3 py-1.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra data-[principal=true]:bg-cobra data-[principal=true]:text-white data-[principal=true]:hover:bg-cobra-oscuro data-[principal=false]:border data-[principal=false]:border-neutral-200 data-[principal=false]:text-neutral-700 data-[principal=false]:hover:bg-neutral-50 dark:data-[principal=false]:border-neutral-800 dark:data-[principal=false]:text-neutral-300 dark:data-[principal=false]:hover:bg-neutral-800"
                    // Solo el siguiente paso pendiente lleva botón sólido: dos
                    // llamadas a la acción del mismo peso no son ninguna.
                    data-principal={paso === siguiente}
                  >
                    {paso.cta}
                  </Link>
                </>
              )}
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}

export function PrimerosPasosFallback() {
  return (
    <div className="h-[4.75rem] rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900" />
  );
}

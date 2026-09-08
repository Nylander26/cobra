import Link from "next/link";
import { hitosDelBurofax } from "@/lib/burofax/avisos";
import { leerBorrador } from "@/lib/burofax/borradores";
import { formatearFecha } from "@/lib/burofax/plazos";
import { ahora } from "@/lib/ahora";
import { formatCents } from "@/lib/money";
import { requireSession } from "@/lib/session";
import { BotonImportar } from "./boton-importar";

const ETIQUETAS: Record<string, string> = {
  burofax_plazo: "Vence el plazo que le diste para pagar",
  monitorio: "Un mes sin pago: decidir si monitorio",
  iva_apertura: "Puedes empezar a recuperar el IVA",
  iva_cierre: "Último aviso antes de perder ese IVA",
  prescripcion: "Hay que volver a reclamar o prescribe",
};

export async function Confirmacion({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  // Lecturas dinámicas, ambas dentro de este boundary: la página de fuera queda
  // estática y esto se resuelve por petición.
  const [{ t }, session, momento] = await Promise.all([
    searchParams,
    requireSession(),
    ahora(),
  ]);
  const borrador = t ? await leerBorrador(t) : null;

  if (!borrador) {
    return (
      <div className="rounded-2xl border border-linea bg-white p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-cobra">
          Enlace caducado
        </p>
        <h1 className="mt-3 font-display text-2xl tracking-tight text-tinta">
          Ese burofax ya no está guardado
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-grafito/80">
          Los datos de un burofax se guardan 72 horas y se borran en cuanto se
          usan. Este enlace ya se ha usado o ha pasado ese plazo — que es
          exactamente lo que debe ocurrir con los datos de tu cliente.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-grafito/80">
          Tu cuenta está creada y dentro. Puedes añadir la factura a mano, o
          volver a generar el burofax y guardarlo desde ahí.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard/invoices"
            className="rounded-lg bg-cobra px-5 py-2 text-sm font-medium text-white transition hover:bg-cobra-oscuro"
          >
            Ir a mis facturas
          </Link>
          <Link
            href="/modelo-burofax-reclamacion-factura-impagada"
            className="rounded-lg border border-linea px-4 py-2 text-sm font-medium text-tinta transition hover:border-cobra/40 hover:text-cobra"
          >
            Generar otro burofax
          </Link>
        </div>
      </div>
    );
  }

  const { payload, generadoEl } = borrador;
  const hitos = hitosDelBurofax(payload, generadoEl).filter(
    (h) => h.scheduledAt.getTime() > momento,
  );

  return (
    <div className="rounded-2xl border border-linea bg-white p-6 shadow-[0_1px_2px_rgba(18,36,28,0.06)] sm:p-8">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-cobra">
        Ya estás dentro
      </p>
      <h1 className="mt-3 font-display text-2xl tracking-tight text-tinta">
        Hola {session.user.name || "de nuevo"}. Guardamos esta factura y te
        avisamos.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-grafito/80">
        Vamos a guardar en tu cuenta la factura por la que generaste el burofax,
        con el cliente al que se la emitiste. A partir de ahí Cobra te avisa a ti
        —a tu correo, no al suyo— en cada fecha que importa.
      </p>

      <dl className="mt-6 divide-y divide-linea border-y border-linea">
        <div className="flex items-start justify-between gap-4 py-3">
          <dt className="font-mono text-[11px] uppercase tracking-wide text-grafito/60">
            Cliente
          </dt>
          <dd className="text-right text-sm text-tinta">
            {payload.deudor.nombre}
            <span className="block text-xs text-grafito/60">
              NIF {payload.deudor.nif}
            </span>
          </dd>
        </div>
        <div className="flex items-start justify-between gap-4 py-3">
          <dt className="font-mono text-[11px] uppercase tracking-wide text-grafito/60">
            Factura
          </dt>
          <dd className="text-right text-sm text-tinta">
            N.º {payload.factura.numero} ·{" "}
            {formatCents(payload.factura.importeCents)}
            <span className="block text-xs text-grafito/60">
              Vencida el {formatearFecha(payload.factura.venceEl)}
            </span>
          </dd>
        </div>
      </dl>

      {hitos.length > 0 && (
        <div className="mt-6 rounded-xl bg-tinta p-5 text-marfil">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-marfil/60">
            Te avisaremos
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {hitos.map((hito) => (
              <li key={hito.kind} className="flex justify-between gap-4">
                <span className="text-marfil/70">{ETIQUETAS[hito.kind]}</span>
                <span className="shrink-0 font-medium">
                  {formatearFecha(hito.scheduledAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <BotonImportar claimToken={t as string} />

      <p className="mt-4 text-xs leading-relaxed text-grafito/60">
        Cobra no le escribirá nada a {payload.deudor.nombre}. Los recordatorios
        automáticos hacia tu cliente son otra cosa y se activan cuando tú
        quieras, desde el panel y con el texto que hayas revisado.
      </p>
    </div>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CobraMark } from "@/components/logo";
import { Confirmacion } from "./confirmacion";

export const metadata: Metadata = {
  title: "Guardar el burofax en tu cuenta — Cobra",
  robots: { index: false, follow: false },
};

// Aquí aterriza el enlace mágico del correo del burofax. La cuenta ya existe
// (Better-Auth la creó al verificar el enlace); lo que falta es meter dentro la
// factura por la que se generó la carta.
//
// El alta de esos datos no ocurre al pintar la página, sino al pulsar el botón:
// un GET no debe escribir en base de datos —un prefetch bastaría para
// dispararlo— y además, tratándose de los datos personales de un tercero, es
// razonable que el usuario vea qué se va a guardar antes de guardarlo.
export default function OnboardingBurofaxPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  return (
    <main className="flex min-h-dvh flex-col bg-papel text-grafito">
      <div className="mx-auto w-full max-w-xl px-6">
        <header className="flex h-20 items-center">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-tinta"
            aria-label="Cobra — inicio"
          >
            <CobraMark className="h-7 w-7" />
            <span className="font-display text-2xl">Cobra</span>
          </Link>
        </header>

        <section className="pb-16 pt-6">
          <Suspense fallback={<ConfirmacionFallback />}>
            <Confirmacion searchParams={searchParams} />
          </Suspense>
        </section>
      </div>
    </main>
  );
}

function ConfirmacionFallback() {
  return (
    <div className="rounded-2xl border border-linea bg-white p-6 sm:p-8">
      <div className="h-3 w-32 animate-pulse rounded bg-linea" />
      <div className="mt-4 h-7 w-3/4 animate-pulse rounded bg-linea" />
      <div className="mt-6 space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-linea" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-linea" />
      </div>
      <div className="mt-6 h-10 w-48 animate-pulse rounded-lg bg-linea" />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { CobraMark } from "@/components/logo";
import { Calculator } from "./calculator";

// Página pública de captación SEO: la calculadora que un autónomo busca en
// Google cuando le deben una factura. Todo el cálculo corre en el navegador
// con la misma librería que usa la app (src/lib/late-interest.ts).

const TIPO_DEMORA = "10,40 %";
const SEMESTRE = "2.º semestre de 2026";
const BOE_LEY = "https://www.boe.es/buscar/act.php?id=BOE-A-2004-21830";

export const metadata: Metadata = {
  title:
    "Calculadora de intereses de demora (Ley 3/2004) — gratis y al día | Cobra",
  description:
    "Calcula cuánto puedes reclamar por una factura impagada: interés de demora oficial por semestres (BOE) más la compensación de 40 € por costes de cobro. Sin registrarte.",
  alternates: { canonical: "/calculadora-intereses-demora" },
  openGraph: {
    title: "Calculadora de intereses de demora — Ley 3/2004",
    description:
      "Importe, fecha de vencimiento, y sabrás cuánto interés de demora y compensación puedes reclamar por tu factura impagada.",
    url: "/calculadora-intereses-demora",
    siteName: "Cobra",
    locale: "es_ES",
    type: "website",
  },
};

const FAQS = [
  {
    q: "¿Qué interés de demora puedo reclamar por una factura impagada?",
    a: `El tipo legal de demora en operaciones comerciales: el tipo del BCE más 8 puntos, publicado cada semestre en el BOE. Ahora mismo (${SEMESTRE}) es el ${TIPO_DEMORA} anual. Se devenga desde el día siguiente al vencimiento, y esta calculadora aplica a cada tramo el tipo de su semestre.`,
  },
  {
    q: "¿Tengo que haberlo pactado en el contrato o avisar antes?",
    a: "No. La Ley 3/2004 lo establece de forma automática para operaciones entre empresas y autónomos: sin necesidad de aviso previo ni de pacto por escrito. Si el contrato fija un interés distinto, prevalece el pactado (con límites frente a cláusulas abusivas).",
  },
  {
    q: "¿Qué son los 40 € de compensación?",
    a: "El artículo 8 de la ley reconoce una cantidad fija de 40 € por factura en concepto de costes de cobro, sin necesidad de justificarlos, y además el resto de costes acreditados que superen esa cifra.",
  },
  {
    q: "¿A qué facturas se aplica?",
    a: "A operaciones comerciales entre empresas, o entre empresas y autónomos, en España. Quedan fuera las operaciones con consumidores y las deudas con las Administraciones Públicas (que tienen su propio régimen de plazos).",
  },
];

export default function CalculadoraPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-papel text-grafito">
      <div className="mx-auto w-full max-w-3xl px-6">
        <header className="flex h-20 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-tinta"
            aria-label="Cobra — inicio"
          >
            <CobraMark className="h-7 w-7" />
            <span className="font-display text-2xl">Cobra</span>
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-cobra px-4 py-2 text-sm font-medium text-white transition hover:bg-cobra-oscuro"
          >
            Empezar gratis
          </Link>
        </header>

        <section className="pb-16 pt-10 sm:pt-14">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-cobra">
            Ley 3/2004 — Medidas contra la morosidad
          </p>
          <h1 className="mt-4 font-display text-3xl tracking-tight text-tinta sm:text-4xl">
            Calculadora de intereses de demora
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-grafito/80">
            Te deben una factura. La ley te debe algo más: interés de demora
            desde el día siguiente al vencimiento —hoy el{" "}
            <strong className="font-semibold text-tinta">{TIPO_DEMORA}</strong>{" "}
            anual— y <strong className="font-semibold text-tinta">40 €</strong>{" "}
            de compensación por costes de cobro. Calcula cuánto, con los tipos
            oficiales de cada semestre.
          </p>

          <div className="mt-10">
            <Calculator />
          </div>

          <div className="mt-12 rounded-2xl bg-tinta p-6 text-marfil sm:p-8">
            <h2 className="font-display text-xl tracking-tight sm:text-2xl">
              ¿Y si no tuvieras que calcular esto?
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-marfil/70">
              Cobra persigue tus facturas por ti: recordatorios automáticos que
              suben de tono con elegancia, con los intereses de la Ley 3/2004
              calculados e incluidos en la reclamación cuando tú decidas.
            </p>
            <Link
              href="/signup"
              className="mt-5 inline-block rounded-lg bg-cobra px-5 py-2.5 text-sm font-medium text-white transition hover:bg-cobra-oscuro"
            >
              Reclamar mis facturas gratis
            </Link>
          </div>

          <section className="mt-14">
            <h2 className="font-display text-2xl tracking-tight text-tinta">
              Preguntas frecuentes
            </h2>
            <dl className="mt-6 space-y-6">
              {FAQS.map((f) => (
                <div key={f.q}>
                  <dt className="font-medium text-tinta">{f.q}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-grafito/80">
                    {f.a}
                  </dd>
                </div>
              ))}
            </dl>
            <a
              href={BOE_LEY}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-block font-mono text-xs text-cobra underline decoration-cobra/40 underline-offset-4"
            >
              Texto consolidado de la Ley 3/2004 en el BOE ↗
            </a>
          </section>
        </section>

        <footer className="border-t border-linea py-8 text-sm text-grafito/60">
          <p>
            Esta calculadora es orientativa y no constituye asesoramiento
            jurídico. Tipos oficiales publicados semestralmente en el BOE.
          </p>
        </footer>
      </div>
    </main>
  );
}

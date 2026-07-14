import type { Metadata } from "next";
import Link from "next/link";
import { CobraMark } from "@/components/logo";
import { Generator } from "./generator";

// Página pública de captación SEO: el modelo de carta que un autónomo busca
// en Google cuando un cliente no le paga. El generador corre entero en el
// navegador; la página es estática.

const BOE_LEY = "https://www.boe.es/buscar/act.php?id=BOE-A-2004-21830";

export const metadata: Metadata = {
  title: "Carta de reclamación de factura impagada — modelo y generador gratis",
  description:
    "Genera en un minuto la carta o email para reclamar una factura impagada: cuatro tonos, del recordatorio amable a la última notificación con los intereses de demora de la Ley 3/2004 calculados. Sin registrarte.",
  alternates: { canonical: "/carta-reclamacion-factura-impagada" },
  openGraph: {
    title: "Carta de reclamación de factura impagada — modelo y generador",
    description:
      "Elige el tono, rellena los datos de la factura y copia la carta lista para enviar. Con los intereses de demora de la Ley 3/2004 incluidos en la última notificación.",
    url: "/carta-reclamacion-factura-impagada",
    siteName: "Cobra",
    locale: "es_ES",
    type: "website",
  },
};

const PASOS = [
  {
    titulo: "Recordatorio amable, antes o justo al vencer",
    texto:
      "Un email corto y cordial días antes del vencimiento (o el mismo día) evita la mayoría de los impagos: muchos retrasos son despistes, no morosidad. Aquí no se reclama nada; se facilita el pago.",
  },
  {
    titulo: "Reclamación firme por escrito",
    texto:
      "Pasados unos días del vencimiento, un email directo que deje constancia: número de factura, importe, fecha de vencimiento y una petición clara de pago con plazo. Guarda el hilo: es tu registro de que reclamaste.",
  },
  {
    titulo: "Última notificación, con la ley delante",
    texto:
      "Si sigue sin pagar, la última carta menciona la Ley 3/2004: intereses de demora automáticos desde el día siguiente al vencimiento y 40 € de compensación por costes de cobro. No hace falta haberlo pactado ni avisar antes.",
  },
  {
    titulo: "Burofax y proceso monitorio",
    texto:
      "Agotada la vía amistosa, un burofax con certificación de contenido da fehaciencia a la reclamación. El siguiente paso es el proceso monitorio: la petición inicial no requiere abogado ni procurador, y la factura con el hilo de reclamaciones es tu prueba.",
  },
];

const FAQS = [
  {
    q: "¿Qué debe incluir una carta de reclamación de factura impagada?",
    a: "Los datos que identifican la deuda sin ambigüedad: número de factura, importe, fecha de emisión o de vencimiento, y una petición de pago clara con plazo. En tonos avanzados, la mención a la Ley 3/2004 (intereses de demora y 40 € de costes de cobro). Siempre educada: la escribe alguien que quiere cobrar y conservar al cliente.",
  },
  {
    q: "¿Es mejor un email, una carta o un burofax?",
    a: "Empieza por email: es inmediato, queda registro del envío y mantiene el tono comercial. El burofax con certificación de contenido se reserva para el final de la vía amistosa, porque da constancia fehaciente de la reclamación de cara a un monitorio. La carta postal ordinaria apenas aporta: ni es fehaciente ni es rápida.",
  },
  {
    q: "¿Puedo reclamar intereses de demora sin haberlos pactado?",
    a: "Sí. La Ley 3/2004 los establece de forma automática en operaciones comerciales entre empresas y autónomos: se devengan desde el día siguiente al vencimiento sin necesidad de aviso ni pacto por escrito, al tipo oficial publicado cada semestre en el BOE (BCE + 8 puntos), más 40 € por factura en concepto de costes de cobro.",
  },
  {
    q: "¿Cuándo paso a la vía judicial?",
    a: "Cuando la vía amistosa se agota: sin respuesta tras varias reclamaciones escritas y un burofax. El proceso monitorio es la vía habitual para deudas dinerarias documentadas (tu factura y el hilo de reclamaciones son la prueba); la petición inicial no requiere abogado ni procurador. Si el deudor no paga ni se opone, la resolución permite el embargo.",
  },
  {
    q: "¿Cada cuánto reenvío la reclamación si no contestan?",
    a: "Una pauta que funciona: recordatorio 3 días antes de vencer, aviso el día del vencimiento, reclamación firme a los 7 días de retraso y última notificación a los 15, ya con los intereses calculados. Lo importante es la constancia: una secuencia regular cobra más que un email aislado escrito con enfado.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function CartaReclamacionPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-papel text-grafito">
      <script
        type="application/ld+json"
        // JSON generado desde constantes propias, sin input del usuario.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
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
            Modelo gratuito — listo para copiar
          </p>
          <h1 className="mt-4 font-display text-3xl tracking-tight text-tinta sm:text-4xl">
            Carta de reclamación de factura impagada
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-grafito/80">
            Escribir al cliente que no paga es incómodo, y por eso se pospone.
            Elige el tono según lo vencida que esté la factura, rellena los
            datos y copia la carta: profesional, educada y con los{" "}
            <strong className="font-semibold text-tinta">
              intereses de demora de la Ley 3/2004
            </strong>{" "}
            ya calculados cuando toca mencionarlos.
          </p>

          <div className="mt-10">
            <Generator />
          </div>

          <section className="mt-14">
            <h2 className="font-display text-2xl tracking-tight text-tinta">
              Cómo reclamar una factura impagada, por orden
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-grafito/80">
              La reclamación efectiva es una escalera, no un estallido: cada
              peldaño sube el tono y deja constancia. La mayoría de las
              facturas se cobran en los dos primeros.
            </p>
            <div className="mt-8 space-y-6">
              {PASOS.map((p, i) => (
                <div key={p.titulo} className="border-t border-linea pt-5">
                  <p className="font-mono text-sm text-cobra">{i + 1}</p>
                  <h3 className="mt-2 font-medium text-tinta">{p.titulo}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-grafito/80">
                    {p.texto}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-12 rounded-2xl bg-tinta p-6 text-marfil sm:p-8">
            <h2 className="font-display text-xl tracking-tight sm:text-2xl">
              Esta carta puede enviarse sola.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-marfil/70">
              Cobra convierte esta escalera en una secuencia automática:
              recordatorios en tu nombre que suben de tono con elegancia hasta
              que la factura queda pagada. Tú añades la factura; del resto se
              encarga Cobra.
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

          <div className="mt-12 rounded-2xl border border-linea bg-white p-6 sm:p-7">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-cobra">
              También te puede servir
            </p>
            <h2 className="mt-2 font-display text-xl tracking-tight text-tinta">
              ¿Cuánto puedes reclamar de más por esta factura?
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-grafito/80">
              La calculadora de intereses de demora aplica el tipo oficial de
              cada semestre (BOE) y suma los 40 € de costes de cobro.
            </p>
            <Link
              href="/calculadora-intereses-demora"
              className="mt-4 inline-block rounded-lg border border-linea px-4 py-2 text-sm font-medium text-tinta transition hover:border-cobra/40 hover:text-cobra"
            >
              Abrir la calculadora →
            </Link>
          </div>
        </section>

        <footer className="border-t border-linea py-8 text-sm text-grafito/60">
          <p>
            Este generador es orientativo y no constituye asesoramiento
            jurídico. Revisa la carta antes de enviarla: sale en tu nombre.
          </p>
        </footer>
      </div>
    </main>
  );
}

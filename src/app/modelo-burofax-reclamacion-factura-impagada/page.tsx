import type { Metadata } from "next";
import Link from "next/link";
import { BotonPreferencias } from "@/components/consent/boton-preferencias";
import { CobraMark } from "@/components/logo";
import { Generador } from "./generador";

// Página pública de captación SEO. La herramienta sola no posiciona: lo que
// rankea es esta explicación —qué es, cuándo se manda, qué tiene que decir para
// interrumpir la prescripción, qué pasa después— con el generador dentro.

const URL_PAGINA = "https://micobra.es/modelo-burofax-reclamacion-factura-impagada";
const BOE_CC = "https://www.boe.es/buscar/act.php?id=BOE-A-1889-4763";
const CORREOS = "https://www.correos.es/es/es/particulares/enviar/burofax";

export const metadata: Metadata = {
  title: "Modelo de burofax para reclamar una factura impagada — generador gratis",
  description:
    "Genera en tres minutos el burofax que interrumpe la prescripción de tu deuda, con los intereses de demora y los 40 € de la Ley 3/2004 ya calculados. PDF listo para llevar a Correos. Sin registro.",
  alternates: { canonical: "/modelo-burofax-reclamacion-factura-impagada" },
  openGraph: {
    title: "Modelo de burofax para reclamar una factura impagada",
    description:
      "Rellena tus datos, los del deudor y los de la factura. Te descargas el burofax en PDF con los intereses ya calculados, listo para llevar a Correos.",
    url: "/modelo-burofax-reclamacion-factura-impagada",
    siteName: "Cobra",
    locale: "es_ES",
    type: "website",
  },
};

const PASOS_HOWTO = [
  {
    nombre: "Reúne los datos de las dos partes",
    texto:
      "Tu nombre o razón social, NIF y domicilio, y los mismos datos del deudor. El domicilio del deudor debe ser el fiscal o el social: es la dirección a la que Correos entregará el burofax.",
  },
  {
    nombre: "Identifica la factura impagada",
    texto:
      "Número, fecha de emisión, fecha de vencimiento, concepto e importe. Una reclamación genérica no acredita qué se reclama.",
  },
  {
    nombre: "Genera y descarga el PDF",
    texto:
      "El generador redacta el requerimiento expreso de pago con su plazo y calcula los intereses de demora y la compensación de 40 € por costes de cobro.",
  },
  {
    nombre: "Envíalo desde Correos con certificación de texto",
    texto:
      "En una oficina o desde correos.es, pidiendo certificación de texto y acuse de recibo. Sin esas dos cosas es una carta normal y no prueba nada. Cuesta unos 30-45 €.",
  },
];

const FAQS = [
  {
    q: "¿Qué es exactamente un burofax?",
    a: "No es un documento legal especial: es una carta normal enviada por un canal que deja prueba. Correos certifica qué texto se envió, a quién, cuándo, y si se entregó o el destinatario lo rechazó. Eso es lo que lo convierte en prueba en un juicio. El modelo que genera esta herramienta es la carta; el burofax es el sobre.",
  },
  {
    q: "¿Hace falta abogado o notario para enviarlo?",
    a: "No. Lo envía el propio acreedor y lo firma él. El requerimiento notarial es una alternativa más cara que produce efectos equivalentes a estos efectos.",
  },
  {
    q: "¿Para qué sirve realmente?",
    a: "Para tres cosas. Interrumpe la prescripción de la deuda (artículo 1973 del Código Civil), de modo que el plazo vuelve a contar desde cero. Constituye en mora al deudor, y con ello se devengan los intereses de demora y la compensación de 40 € por costes de cobro de la Ley 3/2004. Y acredita fehacientemente la reclamación, que es el requisito para recuperar el IVA de una factura impagada.",
  },
  {
    q: "¿Cuánto tiempo tengo para reclamar una factura impagada?",
    a: "Con carácter general, cinco años desde que la deuda pudo exigirse (artículo 1964 del Código Civil). Cada reclamación fehaciente interrumpe ese plazo y lo reinicia por completo, y esa es la razón principal para mandar el burofax aunque no se espere que el deudor pague de inmediato.",
  },
  {
    q: "¿Puedo recuperar el IVA que ya adelanté a Hacienda?",
    a: "Sí, modificando la base imponible por crédito incobrable. Antes de la reforma de la Ley 31/2022 hacía falta reclamación judicial o requerimiento notarial; ahora vale cualquier medio que acredite fehacientemente la reclamación de cobro, y el burofax lo es. Hay dos plazos encadenados que conviene no perder de vista, y por eso el generador te los calcula y te los deja por escrito.",
  },
  {
    q: "¿Qué tiene que decir la carta para que sirva?",
    a: "Identificar sin ambigüedad a las dos partes con NIF y domicilio, identificar la deuda concreta con número de factura, fecha, concepto e importe, y contener un requerimiento expreso de pago con un plazo cierto. Sin ese requerimiento expreso la carta es una queja, no una reclamación, y no interrumpe la prescripción. Es el error más caro que se comete con las plantillas que circulan por internet.",
  },
  {
    q: "¿Y si aun así no me paga?",
    a: "El siguiente paso habitual es el proceso monitorio (artículos 812 y siguientes de la Ley de Enjuiciamiento Civil): no exige abogado ni procurador por debajo de 2.000 € y se inicia con la documentación de la deuda, que a esas alturas ya incluye el acuse de recibo del burofax.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://micobra.es/#organization",
      name: "Cobra",
      url: "https://micobra.es",
      description:
        "Recordatorios de cobro automáticos para autónomos y estudios en España.",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${URL_PAGINA}#app`,
      name: "Generador de burofax para facturas impagadas",
      url: URL_PAGINA,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "es-ES",
      description:
        "Genera el modelo de burofax para reclamar una factura impagada, con requerimiento expreso de pago, intereses de demora de la Ley 3/2004 y compensación de 40 € por costes de cobro. Descarga en PDF.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      isAccessibleForFree: true,
      publisher: { "@id": "https://micobra.es/#organization" },
    },
    {
      "@type": "HowTo",
      "@id": `${URL_PAGINA}#howto`,
      name: "Cómo reclamar una factura impagada por burofax",
      inLanguage: "es-ES",
      totalTime: "PT10M",
      estimatedCost: {
        "@type": "MonetaryAmount",
        currency: "EUR",
        value: "35",
      },
      step: PASOS_HOWTO.map((p, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: p.nombre,
        text: p.texto,
      })),
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${URL_PAGINA}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Cobra",
          item: "https://micobra.es",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Modelo de burofax para reclamar una factura impagada",
          item: URL_PAGINA,
        },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${URL_PAGINA}#faq`,
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function BurofaxPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-papel text-grafito">
      <script
        type="application/ld+json"
        // JSON generado desde constantes propias, sin input del usuario.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
            Reclamación fehaciente — art. 1973 CC y Ley 3/2004
          </p>
          <h1 className="mt-4 font-display text-3xl tracking-tight text-tinta sm:text-4xl">
            Modelo de burofax para reclamar una factura impagada
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-grafito/80">
            Los correos ya no funcionan. El burofax sí: interrumpe la
            prescripción de la deuda, activa los intereses de demora y los{" "}
            <strong className="font-semibold text-tinta">40 €</strong> de costes
            de cobro, y es la prueba que necesitas para recuperar el IVA que ya
            le adelantaste a Hacienda. Rellénalo abajo y te lo descargas en PDF,
            con los intereses ya calculados.
          </p>

          <div className="mt-10">
            <Generador />
          </div>

          <section className="mt-16">
            <h2 className="font-display text-2xl tracking-tight text-tinta">
              Qué hace un burofax que no haga un correo
            </h2>
            <p className="mt-3 leading-relaxed text-grafito/80">
              Un burofax no es un documento legal especial. Es una carta normal
              enviada por un canal que deja prueba: Correos certifica{" "}
              <strong className="font-semibold text-tinta">qué texto</strong> se
              envió, <strong className="font-semibold text-tinta">a quién</strong>{" "}
              y <strong className="font-semibold text-tinta">cuándo</strong>, y
              si se entregó o el destinatario lo rechazó. Eso es lo que lo
              convierte en prueba delante de un juez, y lo que un correo
              electrónico —por muchos acuses de lectura que lleve— no consigue.
            </p>
            <p className="mt-4 leading-relaxed text-grafito/80">
              Lo envía el acreedor, sin abogado ni notario, al domicilio fiscal o
              social del deudor. Y produce tres efectos que conviene tener claros
              porque son la razón entera del trámite:
            </p>
            <ol className="mt-5 space-y-4">
              <li className="rounded-xl border border-linea bg-white p-4 sm:p-5">
                <p className="font-medium text-tinta">
                  Interrumpe la prescripción
                </p>
                <p className="mt-1 text-sm leading-relaxed text-grafito/80">
                  Las deudas no duran para siempre: con carácter general
                  prescriben a los cinco años (
                  <a
                    href={BOE_CC}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cobra underline decoration-cobra/40 underline-offset-4"
                  >
                    art. 1964 CC
                  </a>
                  ). Una reclamación fehaciente reinicia ese contador desde cero
                  (art. 1973 CC). Es el efecto más valioso y el que más gente se
                  deja pasar.
                </p>
              </li>
              <li className="rounded-xl border border-linea bg-white p-4 sm:p-5">
                <p className="font-medium text-tinta">
                  Constituye en mora al deudor
                </p>
                <p className="mt-1 text-sm leading-relaxed text-grafito/80">
                  A partir de ahí corren los intereses de demora al tipo legal
                  del BOE y se devengan los 40 € de compensación por costes de
                  cobro del artículo 8 de la Ley 3/2004, sin necesidad de
                  justificarlos.{" "}
                  <Link
                    href="/calculadora-intereses-demora"
                    className="text-cobra underline decoration-cobra/40 underline-offset-4"
                  >
                    Puedes calcularlos aquí
                  </Link>
                  , aunque el generador ya los incluye en la carta.
                </p>
              </li>
              <li className="rounded-xl border border-linea bg-white p-4 sm:p-5">
                <p className="font-medium text-tinta">
                  Te deja recuperar el IVA
                </p>
                <p className="mt-1 text-sm leading-relaxed text-grafito/80">
                  Ese IVA que le adelantaste a Hacienda por una factura que
                  nunca cobraste se puede recuperar modificando la base
                  imponible por crédito incobrable. Antes hacía falta ir al
                  notario o al juzgado; desde la reforma de 2023 basta con
                  acreditar fehacientemente la reclamación. El burofax lo hace.
                </p>
              </li>
            </ol>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl tracking-tight text-tinta">
              Qué tiene que decir para que sirva
            </h2>
            <p className="mt-3 leading-relaxed text-grafito/80">
              Aquí está el error que hace inútiles la mitad de las plantillas que
              circulan por internet: una carta que se queja del impago pero no{" "}
              <strong className="font-semibold text-tinta">
                requiere expresamente el pago
              </strong>{" "}
              con un plazo cierto no es una reclamación, y por tanto no
              interrumpe la prescripción. Son 35 € gastados para nada, y lo peor
              es que quien la manda se queda creyendo que sí ha reclamado.
            </p>
            <p className="mt-4 leading-relaxed text-grafito/80">
              Un requerimiento que funciona necesita, como mínimo: identificar a
              las dos partes con NIF y domicilio, identificar la deuda concreta
              (número de factura, fecha, concepto e importe), requerir el pago de
              forma expresa con un plazo, y advertir de las consecuencias de no
              atenderlo. El generador de arriba escribe las cuatro cosas.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl tracking-tight text-tinta">
              Cómo se envía
            </h2>
            <ol className="mt-5 space-y-3">
              {PASOS_HOWTO.map((paso, i) => (
                <li key={paso.nombre} className="flex gap-4">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cobra/10 font-mono text-xs text-cobra">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-tinta">{paso.nombre}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-grafito/80">
                      {paso.texto}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <a
              href={CORREOS}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-block font-mono text-xs text-cobra underline decoration-cobra/40 underline-offset-4"
            >
              Enviar un burofax desde correos.es ↗
            </a>
          </section>

          <div className="mt-14 rounded-2xl bg-tinta p-6 text-marfil sm:p-8">
            <h2 className="font-display text-xl tracking-tight sm:text-2xl">
              El burofax es el cuarto paso. Los tres primeros los da Cobra
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-marfil/70">
              Recordatorio antes del vencimiento, aviso el día que vence,
              reclamación firme a los quince días. Automáticos, en tu nombre y
              desde tu dominio, hasta que te paguen. Si aun así no pagan, ya
              sabes dónde está la carta.
            </p>
            <Link
              href="/signup"
              className="mt-5 inline-block rounded-lg bg-cobra px-5 py-2.5 text-sm font-medium text-white transition hover:bg-cobra-oscuro"
            >
              Poner mis facturas en automático
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
          </section>

          <div className="mt-12 rounded-2xl border border-linea bg-white p-6 sm:p-7">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-cobra">
              Antes de llegar aquí
            </p>
            <h2 className="mt-2 font-display text-xl tracking-tight text-tinta">
              La carta de reclamación por correo, ya escrita
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-grafito/80">
              Si la factura acaba de vencer, empieza por ahí: del recordatorio
              amable a la última notificación antes del burofax.
            </p>
            <Link
              href="/carta-reclamacion-factura-impagada"
              className="mt-4 inline-block rounded-lg border border-linea px-4 py-2 text-sm font-medium text-tinta transition hover:border-cobra/40 hover:text-cobra"
            >
              Generar la carta de reclamación →
            </Link>
          </div>
        </section>

        <footer className="border-t border-linea py-8 text-sm text-grafito/60">
          <p>
            Este generador produce un modelo orientativo y no constituye
            asesoramiento jurídico. Si la deuda es alta o el deudor ya ha
            discutido la factura, consulta con un abogado antes de enviarlo.
          </p>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/legal/privacidad" className="hover:text-cobra">
              Privacidad
            </Link>
            <Link href="/legal/cookies" className="hover:text-cobra">
              Cookies
            </Link>
            <BotonPreferencias className="hover:text-cobra" />
          </p>
        </footer>
      </div>
    </main>
  );
}

import Link from "next/link";
import { CobraMark } from "@/components/logo";
import { Reveal } from "@/components/reveal";
import { PLAN_ORDER, PLANS } from "@/lib/plans";
import { HeroWave } from "./hero-wave";

// Tipo legal vigente. Mantener en sintonía con RATES (src/lib/late-interest.ts):
// se publica cada semestre en el BOE.
const TIPO_DEMORA = "10,40 %";
const SEMESTRE = "2.º semestre de 2026";
const BOE_LEY =
  "https://www.boe.es/buscar/act.php?id=BOE-A-2004-21830";

const PASOS = [
  {
    n: "1",
    titulo: "Añade la factura",
    texto:
      "Cliente, importe y vencimiento. Cobra prepara la secuencia de recordatorios en ese mismo momento.",
  },
  {
    n: "2",
    titulo: "Cobra insiste por ti",
    texto:
      "Emails programados que suben de tono con elegancia: amables antes de vencer, firmes después. Siempre en tu nombre.",
  },
  {
    n: "3",
    titulo: "Te pagan, y en paz",
    texto:
      "Márcala como pagada y todo se detiene. Sin llamadas incómodas ni hilos de correo eternos.",
  },
];

const SECUENCIA = [
  {
    dia: "3 días antes de vencer",
    tono: "Amable",
    tonoClase: "bg-cobra/10 text-cobra",
    asunto: "Factura F-2026-014 — vence el viernes",
    cuerpo:
      "Hola Marta: te escribo solo para recordarte que la factura F-2026-014, de 1.850 €, vence este viernes 17. Te la adjunto de nuevo por si no la tienes a mano. ¡Gracias!",
  },
  {
    dia: "7 días después",
    tono: "Directo",
    tonoClase: "bg-grafito/10 text-grafito",
    asunto: "Factura F-2026-014 — pendiente de pago",
    cuerpo:
      "Hola Marta: la factura F-2026-014 venció el pasado día 17 y sigue pendiente. ¿Me confirmas cuándo tenéis prevista la transferencia?",
  },
  {
    dia: "21 días después",
    tono: "Firme",
    tonoClase: "bg-ambar/15 text-ambar",
    asunto: "Factura F-2026-014 — segunda reclamación",
    cuerpo:
      "Hola Marta: la factura sigue pendiente 21 días después de su vencimiento. Te recuerdo que la Ley 3/2004 devenga intereses de demora desde el día siguiente al vencimiento —a día de hoy, 11,07 €— además de 40 € en concepto de costes de cobro.",
  },
];

function Eyebrow({
  children,
  claro = false,
}: {
  children: React.ReactNode;
  claro?: boolean;
}) {
  return (
    <p
      className={`font-mono text-xs uppercase tracking-[0.18em] ${
        claro ? "text-musgo" : "text-cobra"
      }`}
    >
      {children}
    </p>
  );
}

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col bg-papel text-grafito">
      {/* Sin JS no hay IntersectionObserver: deja el contenido visible. */}
      <noscript>
        <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
      </noscript>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-tinta text-marfil">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_80%_-10%,#1b342a_0%,transparent_60%)]" />
        <HeroWave />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
          <header className="flex h-20 items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-marfil"
              aria-label="Cobra — inicio"
            >
              <CobraMark className="h-7 w-7" />
              <span className="font-display text-2xl">Cobra</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <a
                href="#como-funciona"
                className="hidden text-marfil/70 transition hover:text-marfil sm:block"
              >
                Cómo funciona
              </a>
              <a
                href="#precios"
                className="hidden text-marfil/70 transition hover:text-marfil sm:block"
              >
                Precios
              </a>
              <Link
                href="/login"
                className="text-marfil/70 transition hover:text-marfil"
              >
                Entrar
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-marfil px-4 py-2 font-medium text-tinta transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marfil"
              >
                Empezar gratis
              </Link>
            </nav>
          </header>

          <div className="max-w-3xl pt-20 pb-36 sm:pt-28 sm:pb-44">
            <div className="animate-rise">
              <Eyebrow claro>Para autónomos y estudios en España</Eyebrow>
            </div>
            <h1 className="animate-rise-2 mt-5 font-display text-5xl leading-[1.04] tracking-tight text-marfil sm:text-6xl md:text-7xl">
              Cobrar no debería ser{" "}
              <em className="italic">tu&nbsp;trabajo.</em>
            </h1>
            <p className="animate-rise-3 mt-6 max-w-xl text-lg leading-relaxed text-marfil/75">
              Cobra envía recordatorios de pago automáticos, educados y en tu
              nombre hasta que la factura queda pagada. Tú no vuelves a
              escribir un email incómodo.
            </p>
            <div className="animate-rise-3 mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="rounded-lg bg-marfil px-6 py-3 text-sm font-medium text-tinta transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marfil"
              >
                Empezar gratis
              </Link>
              <a
                href="#como-funciona"
                className="rounded-lg border border-marfil/25 px-6 py-3 text-sm font-medium text-marfil transition hover:border-marfil/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marfil"
              >
                Ver cómo funciona
              </a>
            </div>
            <p className="animate-rise-3 mt-5 font-mono text-xs text-musgo">
              2 facturas en seguimiento gratis · Sin tarjeta
            </p>
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ────────────────────────────────────────────── */}
      <section id="como-funciona" className="scroll-mt-8">
        <Reveal className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-28">
          <Eyebrow>Cómo funciona</Eyebrow>
          <h2 className="mt-4 max-w-2xl font-display text-3xl tracking-tight text-tinta sm:text-4xl">
            Tres pasos, y solo el primero es tuyo.
          </h2>

          <div className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {PASOS.map((paso) => (
              <div key={paso.n} className="border-t border-linea pt-6">
                <p className="font-mono text-sm text-cobra">{paso.n}</p>
                <h3 className="mt-3 text-lg font-semibold text-tinta">
                  {paso.titulo}
                </h3>
                <p className="mt-2 leading-relaxed text-grafito/75">
                  {paso.texto}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── La secuencia ─────────────────────────────────────────────── */}
      <section className="border-y border-linea bg-white/60">
        <Reveal className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-28">
          <Eyebrow>La secuencia</Eyebrow>
          <h2 className="mt-4 max-w-2xl font-display text-3xl tracking-tight text-tinta sm:text-4xl">
            Educada al principio. Firme cuando toca.
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-grafito/75">
            Esto es lo que recibe tu cliente. Cada email sale con tu nombre y
            tu firma: tu cliente nunca ve a Cobra.
          </p>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {SECUENCIA.map((email) => (
              <article
                key={email.dia}
                className="flex flex-col rounded-2xl border border-linea bg-white p-6 shadow-[0_1px_2px_rgba(18,36,28,0.06)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs text-grafito/60">
                    {email.dia}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-1 font-mono text-[11px] ${email.tonoClase}`}
                  >
                    {email.tono}
                  </span>
                </div>
                <p className="mt-4 font-medium text-tinta">{email.asunto}</p>
                <p className="mt-3 text-sm leading-relaxed text-grafito/75">
                  {email.cuerpo}
                </p>
              </article>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── Ley 3/2004 ───────────────────────────────────────────────── */}
      <section className="bg-tinta text-marfil">
        <Reveal className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-28">
          <div className="grid items-start gap-12 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <Eyebrow claro>Ley 3/2004 — Medidas contra la morosidad</Eyebrow>
              <h2 className="mt-4 font-display text-3xl tracking-tight sm:text-4xl">
                La ley ya está de tu lado.{" "}
                <em className="italic text-ambar-claro">Cobra la aplica.</em>
              </h2>
              <p className="mt-5 max-w-xl leading-relaxed text-marfil/70">
                Toda factura entre empresas devenga intereses de demora desde
                el día siguiente a su vencimiento, sin aviso previo ni pacto
                por escrito. Cobra los calcula por semestres con el tipo
                oficial publicado en el BOE y los añade a tus reclamaciones
                cuando tú decidas.
              </p>
              <a
                href={BOE_LEY}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-block font-mono text-xs text-musgo underline decoration-musgo/40 underline-offset-4 transition hover:text-marfil"
              >
                Texto consolidado en el BOE ↗
              </a>
            </div>

            <dl className="space-y-8 border-l border-marfil/15 pl-8">
              <div>
                <dd className="font-mono text-5xl tracking-tight text-ambar-claro sm:text-6xl">
                  {TIPO_DEMORA}
                </dd>
                <dt className="mt-2 text-sm text-marfil/60">
                  de interés anual sobre lo vencido · {SEMESTRE}
                </dt>
              </div>
              <div>
                <dd className="font-mono text-5xl tracking-tight text-ambar-claro sm:text-6xl">
                  + 40 €
                </dd>
                <dt className="mt-2 text-sm text-marfil/60">
                  de compensación por costes de cobro, por factura (art. 8)
                </dt>
              </div>
            </dl>
          </div>
        </Reveal>
      </section>

      {/* ── Precios ──────────────────────────────────────────────────── */}
      <section id="precios" className="scroll-mt-8">
        <Reveal className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-28">
          <Eyebrow>Precios</Eyebrow>
          <h2 className="mt-4 max-w-2xl font-display text-3xl tracking-tight text-tinta sm:text-4xl">
            Empieza gratis. Sube cuando te compense.
          </h2>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {PLAN_ORDER.map((id) => {
              const p = PLANS[id];
              const destacado = id === "autonomo";
              return (
                <div
                  key={id}
                  className={`flex flex-col rounded-2xl border bg-white p-6 ${
                    destacado
                      ? "border-cobra shadow-[0_8px_30px_rgba(25,108,76,0.12)]"
                      : "border-linea"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-tinta">{p.name}</h3>
                    {destacado && (
                      <span className="rounded-full bg-cobra/10 px-2.5 py-1 font-mono text-[11px] text-cobra">
                        Para el día a día
                      </span>
                    )}
                  </div>
                  <p className="mt-3 font-mono text-4xl tracking-tight text-tinta">
                    {p.priceCents / 100} €
                    <span className="text-sm text-grafito/50">
                      {p.priceCents === 0 ? " para siempre" : " /mes"}
                    </span>
                  </p>
                  <ul className="mt-5 flex-1 space-y-2 text-sm text-grafito/75">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="text-cobra">·</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={`mt-6 rounded-lg px-4 py-2.5 text-center text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra ${
                      destacado
                        ? "bg-cobra text-white hover:bg-cobra-oscuro"
                        : "border border-linea text-tinta hover:border-cobra/40"
                    }`}
                  >
                    {p.priceCents === 0 ? "Empezar gratis" : "Probar 14 días"}
                  </Link>
                </div>
              );
            })}
          </div>
          <p className="mt-6 font-mono text-xs text-grafito/50">
            Los planes de pago incluyen 14 días de prueba. Sin permanencia:
            cancela cuando quieras.
          </p>
        </Reveal>
      </section>

      {/* ── Cierre + footer ──────────────────────────────────────────── */}
      <section className="bg-tinta text-marfil">
        <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <h2 className="max-w-xl font-display text-3xl tracking-tight sm:text-4xl">
              La próxima factura vencida puede{" "}
              <em className="italic">reclamarse sola.</em>
            </h2>
            <Link
              href="/signup"
              className="shrink-0 rounded-lg bg-marfil px-6 py-3 text-sm font-medium text-tinta transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marfil"
            >
              Empezar gratis
            </Link>
          </div>

          <footer className="mt-16 border-t border-marfil/15 pt-10">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
              <div>
                <div className="flex items-center gap-2.5 text-marfil/80">
                  <CobraMark className="h-5 w-5" />
                  <span className="font-display text-lg">Cobra</span>
                </div>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-marfil/50">
                  Recordatorios de cobro automáticos, educados y en tu nombre,
                  hasta que la factura queda pagada.
                </p>
              </div>

              <nav aria-label="Producto">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-musgo">
                  Producto
                </p>
                <ul className="mt-4 space-y-2.5 text-sm text-marfil/60">
                  <li>
                    <a
                      href="#como-funciona"
                      className="transition hover:text-marfil"
                    >
                      Cómo funciona
                    </a>
                  </li>
                  <li>
                    <a href="#precios" className="transition hover:text-marfil">
                      Precios
                    </a>
                  </li>
                  <li>
                    <Link href="/login" className="transition hover:text-marfil">
                      Entrar
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/signup"
                      className="transition hover:text-marfil"
                    >
                      Empezar gratis
                    </Link>
                  </li>
                </ul>
              </nav>

              <nav aria-label="Herramientas gratuitas">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-musgo">
                  Herramientas
                </p>
                <ul className="mt-4 space-y-2.5 text-sm text-marfil/60">
                  <li>
                    <Link
                      href="/calculadora-intereses-demora"
                      className="transition hover:text-marfil"
                    >
                      Calculadora de intereses
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/carta-reclamacion-factura-impagada"
                      className="transition hover:text-marfil"
                    >
                      Carta de reclamación
                    </Link>
                  </li>
                  <li>
                    <a
                      href={BOE_LEY}
                      target="_blank"
                      rel="noreferrer"
                      className="transition hover:text-marfil"
                    >
                      Ley 3/2004 ↗
                    </a>
                  </li>
                </ul>
              </nav>

              <nav aria-label="Legal">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-musgo">
                  Legal
                </p>
                <ul className="mt-4 space-y-2.5 text-sm text-marfil/60">
                  <li>
                    <Link
                      href="/legal/aviso-legal"
                      className="transition hover:text-marfil"
                    >
                      Aviso legal
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/legal/privacidad"
                      className="transition hover:text-marfil"
                    >
                      Privacidad
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/legal/condiciones"
                      className="transition hover:text-marfil"
                    >
                      Condiciones
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>

            <p className="mt-12 border-t border-marfil/10 pt-6 font-mono text-xs text-marfil/40">
              © 2026 Cobra · Hecho para autónomos en España
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}

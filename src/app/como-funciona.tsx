"use client";

import { useRef, useState } from "react";

// Walkthrough de la app en la landing. Es un cliente porque el visitante
// cambia de paso, pero no lee nada de la request: la home se sigue
// prerenderizando entera.
//
// Las pantallas son maquetas en HTML, no capturas. Pesan menos que un PNG, se
// ven nítidas en el móvil —de donde viene más del 90 % del tráfico— y usan los
// mismos tokens que la app, así que no envejecen cada vez que cambia la
// interfaz.

function Campo({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-linea/70 py-2.5 last:border-0">
      <span className="text-xs text-grafito/60">{etiqueta}</span>
      <span className="font-medium text-tinta">{valor}</span>
    </div>
  );
}

function Chip({ children, clase }: { children: React.ReactNode; clase: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${clase}`}
    >
      {children}
    </span>
  );
}

function PantallaFactura() {
  return (
    <>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-grafito/50">
        Nueva factura
      </p>
      <div className="mt-3">
        <Campo etiqueta="Cliente" valor="Marta Ruiz — Estudio Nórdico" />
        <Campo etiqueta="Importe" valor="1.850,00 €" />
        <Campo etiqueta="Vencimiento" valor="17 de julio" />
      </div>
      <div className="mt-5 rounded-xl bg-papel p-4">
        <p className="text-xs leading-relaxed text-grafito/70">
          Al guardarla se programan{" "}
          <strong className="text-tinta">tres recordatorios</strong>. No hay que
          configurar nada más.
        </p>
        <ul className="mt-3 space-y-1.5 font-mono text-[11px] text-grafito/60">
          <li className="flex justify-between">
            <span>14 jul</span> <span>Amable</span>
          </li>
          <li className="flex justify-between">
            <span>24 jul</span> <span>Directo</span>
          </li>
          <li className="flex justify-between">
            <span>7 ago</span> <span>Firme</span>
          </li>
        </ul>
      </div>
    </>
  );
}

const RECORDATORIOS = [
  { dia: "14 jul", tono: "Amable", estado: "Enviado", hecho: true },
  { dia: "24 jul", tono: "Directo", estado: "Enviado", hecho: true },
  { dia: "7 ago", tono: "Firme", estado: "Programado", hecho: false },
];

function PantallaRecordatorios() {
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-grafito/50">
          F-2026-014 · Secuencia
        </p>
        <Chip clase="bg-ambar/15 text-ambar">Vencida</Chip>
      </div>
      <ol className="mt-4 space-y-3">
        {RECORDATORIOS.map((r) => (
          <li key={r.dia} className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={`size-2 shrink-0 rounded-full ${
                r.hecho ? "bg-cobra" : "border border-linea bg-white"
              }`}
            />
            <span className="w-14 shrink-0 font-mono text-[11px] text-grafito/50">
              {r.dia}
            </span>
            <span className="flex-1 text-sm text-tinta">{r.tono}</span>
            <span className="font-mono text-[11px] text-grafito/50">
              {r.estado}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-5 rounded-xl bg-papel p-4">
        <p className="font-mono text-[11px] text-grafito/50">
          De: tu@tudominio.es
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-grafito/80">
          «Hola Marta: la factura F-2026-014 venció el pasado día 17 y sigue
          pendiente. ¿Me confirmas cuándo tenéis prevista la transferencia?»
        </p>
      </div>
    </>
  );
}

const FACTURAS = [
  { ref: "F-2026-014", importe: "1.850,00 €", pagada: true },
  { ref: "F-2026-015", importe: "640,00 €", pagada: true },
  { ref: "F-2026-016", importe: "2.100,00 €", pagada: false },
];

function PantallaPagada() {
  return (
    <>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-grafito/50">
        Tus facturas
      </p>
      <ul className="mt-3 divide-y divide-linea/70">
        {FACTURAS.map((f) => (
          <li key={f.ref} className="flex items-center justify-between py-2.5">
            <span className="font-mono text-[11px] text-grafito/60">
              {f.ref}
            </span>
            <span className="text-sm font-medium text-tinta">{f.importe}</span>
            {f.pagada ? (
              <Chip clase="bg-cobra/10 text-cobra">Pagada</Chip>
            ) : (
              <Chip clase="bg-grafito/10 text-grafito">En plazo</Chip>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-5 rounded-xl bg-papel p-4">
        <p className="text-xs leading-relaxed text-grafito/70">
          Al marcarla como pagada,{" "}
          <strong className="text-tinta">la secuencia se detiene sola</strong>.
          Nadie recibe un recordatorio de una factura que ya está cobrada.
        </p>
      </div>
    </>
  );
}

const PASOS = [
  {
    n: "1",
    titulo: "Añade la factura",
    texto:
      "Cliente, importe y vencimiento. Cobra prepara la secuencia de recordatorios en ese mismo momento.",
    Pantalla: PantallaFactura,
  },
  {
    n: "2",
    titulo: "Cobra insiste por ti",
    texto:
      "Emails programados que suben de tono con elegancia: amables antes de vencer, firmes después. Siempre en tu nombre.",
    Pantalla: PantallaRecordatorios,
  },
  {
    n: "3",
    titulo: "Te pagan, y en paz",
    texto:
      "Márcala como pagada y todo se detiene. Sin llamadas incómodas ni hilos de correo eternos.",
    Pantalla: PantallaPagada,
  },
];

export function ComoFunciona() {
  const [activo, setActivo] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  // Patrón de pestañas del APG: las flechas mueven el foco y activan, Inicio y
  // Fin saltan a los extremos. Sin esto la sección no se puede usar con
  // teclado, porque solo una pestaña está en el orden de tabulación.
  function alPulsarTecla(evento: React.KeyboardEvent) {
    const saltos: Record<string, number> = {
      ArrowRight: activo + 1,
      ArrowLeft: activo - 1,
      Home: 0,
      End: PASOS.length - 1,
    };
    const destino = saltos[evento.key];
    if (destino === undefined) return;
    evento.preventDefault();
    const siguiente = (destino + PASOS.length) % PASOS.length;
    setActivo(siguiente);
    tabs.current[siguiente]?.focus();
  }

  const paso = PASOS[activo];
  const Pantalla = paso.Pantalla;

  return (
    <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start lg:gap-16">
      <div
        role="tablist"
        aria-label="Pasos para usar Cobra"
        onKeyDown={alPulsarTecla}
        className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 lg:gap-0"
      >
        {PASOS.map((p, i) => {
          const seleccionado = i === activo;
          return (
            <button
              key={p.n}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`paso-tab-${p.n}`}
              aria-selected={seleccionado}
              aria-controls={`paso-panel-${p.n}`}
              tabIndex={seleccionado ? 0 : -1}
              onClick={() => setActivo(i)}
              className={`border-t pt-6 text-left transition-colors lg:pb-6 ${
                seleccionado
                  ? "border-cobra"
                  : "border-linea hover:border-grafito/30"
              }`}
            >
              <p
                className={`font-mono text-sm transition-colors ${
                  seleccionado ? "text-cobra" : "text-grafito/40"
                }`}
              >
                {p.n}
              </p>
              <h3 className="mt-3 text-lg font-semibold text-tinta">
                {p.titulo}
              </h3>
              {/* El texto no se esconde nunca: atenuarlo marca cuál está
                  abierto sin obligar a hacer clic para poder leer los tres. */}
              <p
                className={`mt-2 leading-relaxed text-grafito/75 lg:transition-opacity ${
                  seleccionado ? "lg:opacity-100" : "lg:opacity-45"
                }`}
              >
                {p.texto}
              </p>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`paso-panel-${paso.n}`}
        aria-labelledby={`paso-tab-${paso.n}`}
        tabIndex={0}
        // Altura mínima: cambiar de paso no puede desplazar lo que hay debajo.
        className="min-h-[26rem] rounded-2xl border border-linea bg-white p-6 shadow-[0_1px_2px_rgba(18,36,28,0.06)]"
      >
        <Pantalla />
      </div>
    </div>
  );
}

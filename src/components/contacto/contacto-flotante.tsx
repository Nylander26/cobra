"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Spinner } from "@/components/icons";
import { type ContactoState, enviarConsulta } from "./actions";

const POS_KEY = "cobra_contacto_pos";
// Por debajo de este recorrido el gesto se trata como clic: al arrastrar con
// el dedo siempre se mueve algún píxel, y sin margen el botón no abriría nunca
// en móvil.
const UMBRAL_ARRASTRE = 6;
// Lado del botón flotante (h-14 w-14): el contenedor mide exactamente esto, así
// el recorte contra la pantalla no depende de si el panel está abierto.
const LADO_BOTON = 56;
const MARGEN = 16;
const HUECO = 12;
const ANCHO_PANEL = 320;
const ALTO_MINIMO_PANEL = 200;

type Pos = { x: number; y: number };

// El panel se coloca respecto al botón, no dentro de él: se centra sobre la
// burbuja, se recorta a la pantalla y se abre hacia el lado con más hueco.
// Cuando no cabe ni arriba ni abajo —móvil apaisado, teclado abierto— deja de
// seguir a la burbuja y se ancla a la pantalla, que es la única forma de que no
// se salga por un borde.
type Anclaje =
  | { modo: "junto"; x: number; ancho: number; alto: number; debajo: boolean }
  | { modo: "pantalla"; x: number; y: number; ancho: number; alto: number };

function dentroDePantalla(
  pos: Pos,
  ancho: number,
  alto: number,
  bloqueo: number,
): Pos {
  return {
    x: Math.min(Math.max(8, pos.x), Math.max(8, window.innerWidth - ancho - 8)),
    y: Math.min(
      Math.max(8, pos.y),
      Math.max(8, window.innerHeight - bloqueo - alto - 8),
    ),
  };
}

function calcularAnclaje(caja: DOMRect, bloqueo: number): Anclaje {
  const ancho = Math.min(ANCHO_PANEL, window.innerWidth - MARGEN * 2);
  const huecoArriba = caja.top - HUECO - MARGEN;
  const huecoAbajo =
    window.innerHeight - bloqueo - caja.bottom - HUECO - MARGEN;
  const alto = Math.max(huecoArriba, huecoAbajo);

  if (alto < ALTO_MINIMO_PANEL) {
    return {
      modo: "pantalla",
      x: Math.max(MARGEN, Math.round((window.innerWidth - ancho) / 2)),
      y: MARGEN,
      ancho,
      alto: Math.max(0, window.innerHeight - bloqueo - MARGEN * 2),
    };
  }

  const centrado = caja.left + caja.width / 2 - ancho / 2;
  const maximo = Math.max(MARGEN, window.innerWidth - ancho - MARGEN);
  const x = Math.min(Math.max(MARGEN, centrado), maximo);
  return {
    // Relativo al contenedor, que es lo que posiciona al panel.
    x: x - caja.left,
    ancho,
    alto,
    debajo: huecoAbajo > huecoArriba,
    modo: "junto",
  };
}

// Cuánto ocupan las barras fijas al fondo de la pantalla —hoy el banner de
// cookies, mañana lo que sea—. El widget las mide en vez de conocerlas: basta
// con que lleven `data-barra-inferior` para que se aparte de ellas en lugar de
// quedarse debajo, que es lo que pasaba en móvil, donde el banner es alto.
function useBloqueoInferior() {
  const [bloqueo, setBloqueo] = useState(0);

  useEffect(() => {
    let pendiente = 0;

    function medir() {
      let maximo = 0;
      for (const nodo of document.querySelectorAll<HTMLElement>(
        "[data-barra-inferior]",
      )) {
        const caja = nodo.getBoundingClientRect();
        // Solo estorba lo que de verdad está pegado al fondo de la ventana.
        if (caja.height > 0 && caja.bottom >= window.innerHeight - 1) {
          maximo = Math.max(maximo, caja.height);
        }
      }
      setBloqueo(maximo);
    }

    const tamano = new ResizeObserver(medir);

    // El DOM cambia en cada render de la app; remirar en cada mutación sería
    // caro, así que se agrupa en un frame.
    function revisar() {
      if (pendiente) return;
      pendiente = requestAnimationFrame(() => {
        pendiente = 0;
        tamano.disconnect();
        for (const nodo of document.querySelectorAll("[data-barra-inferior]")) {
          tamano.observe(nodo);
        }
        medir();
      });
    }

    const dom = new MutationObserver(revisar);
    dom.observe(document.body, { childList: true, subtree: true });
    revisar();
    window.addEventListener("resize", medir);

    return () => {
      if (pendiente) cancelAnimationFrame(pendiente);
      dom.disconnect();
      tamano.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, []);

  return bloqueo;
}

export function ContactoFlotante() {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [anclaje, setAnclaje] = useState<Anclaje | null>(null);
  const contenedor = useRef<HTMLDivElement>(null);
  const gesto = useRef<{ dx: number; dy: number; movido: boolean } | null>(null);

  const bloqueo = useBloqueoInferior();

  const [estado, accion, pendiente] = useActionState<ContactoState, FormData>(
    enviarConsulta,
    {},
  );

  // La posición es una comodidad por navegador, no estado compartido: si el
  // almacenamiento falla (ventana privada, cookies bloqueadas) el widget
  // aparece en su esquina de siempre y no pasa nada.
  useEffect(() => {
    try {
      const crudo = localStorage.getItem(POS_KEY);
      if (crudo) {
        const guardada = JSON.parse(crudo) as Pos;
        if (typeof guardada?.x === "number" && typeof guardada?.y === "number") {
          const caja = contenedor.current?.getBoundingClientRect();
          setPos(
            dentroDePantalla(
              guardada,
              caja?.width ?? LADO_BOTON,
              caja?.height ?? LADO_BOTON,
              // Al montar aún no se ha medido la barra del fondo; el efecto de
              // recolocación sube el botón en cuanto aparezca.
              0,
            ),
          );
        }
      }
    } catch {
      // Sin posición guardada: esquina por defecto.
    }
  }, []);

  // Si la ventana encoge, lo arrastrado ayer puede quedar fuera de la pantalla
  // de hoy y volverse inalcanzable; y el panel abierto deja de caber donde
  // estaba.
  // Y si aparece una barra al fondo —el banner de cookies—, lo que estaba
  // pegado abajo queda tapado: hay que subirlo.
  useEffect(() => {
    function recolocar() {
      const caja = contenedor.current?.getBoundingClientRect();
      setPos((p) =>
        p
          ? dentroDePantalla(
              p,
              caja?.width ?? LADO_BOTON,
              caja?.height ?? LADO_BOTON,
              bloqueo,
            )
          : p,
      );
      if (caja) setAnclaje(calcularAnclaje(caja, bloqueo));
    }
    recolocar();
    window.addEventListener("resize", recolocar);
    return () => window.removeEventListener("resize", recolocar);
  }, [bloqueo]);

  // Antes de pintar, para que el panel no aparezca nunca en una posición que
  // luego se corrige a ojos del usuario.
  useLayoutEffect(() => {
    if (!abierto) return;
    const caja = contenedor.current?.getBoundingClientRect();
    if (caja) setAnclaje(calcularAnclaje(caja, bloqueo));
  }, [abierto, pos, bloqueo]);

  useEffect(() => {
    if (!abierto) return;
    function alPulsar(ev: KeyboardEvent) {
      if (ev.key === "Escape") setAbierto(false);
    }
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [abierto]);

  const alBajar = useCallback((ev: React.PointerEvent<HTMLElement>) => {
    const caja = contenedor.current?.getBoundingClientRect();
    if (!caja) return;
    gesto.current = {
      dx: ev.clientX - caja.left,
      dy: ev.clientY - caja.top,
      movido: false,
    };
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    setArrastrando(true);
  }, []);

  const alMover = useCallback(
    (ev: React.PointerEvent<HTMLElement>) => {
      const g = gesto.current;
      const caja = contenedor.current?.getBoundingClientRect();
      if (!g || !caja) return;
      const siguiente = { x: ev.clientX - g.dx, y: ev.clientY - g.dy };
      if (
        Math.abs(siguiente.x - caja.left) > UMBRAL_ARRASTRE ||
        Math.abs(siguiente.y - caja.top) > UMBRAL_ARRASTRE
      ) {
        g.movido = true;
      }
      setPos(dentroDePantalla(siguiente, caja.width, caja.height, bloqueo));
    },
    [bloqueo],
  );

  const alSoltar = useCallback((ev: React.PointerEvent<HTMLElement>) => {
    const g = gesto.current;
    gesto.current = null;
    setArrastrando(false);
    (ev.currentTarget as HTMLElement).releasePointerCapture?.(ev.pointerId);
    if (!g) return;
    // Un arrastre no debe abrir ni cerrar el panel.
    if (!g.movido) setAbierto((v) => !v);
    setPos((p) => {
      if (p) {
        try {
          localStorage.setItem(POS_KEY, JSON.stringify(p));
        } catch {
          // La posición no se recordará; el widget sigue funcionando.
        }
      }
      return p;
    });
  }, []);

  // Sin posición guardada manda la esquina de siempre, pero por encima de la
  // barra del fondo y del indicador de inicio de iOS.
  const estilo: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" }
    : {
        bottom: `calc(${bloqueo}px + ${MARGEN}px + env(safe-area-inset-bottom, 0px))`,
      };

  return (
    <div
      ref={contenedor}
      style={estilo}
      className={`fixed right-4 z-40 h-14 w-14 ${
        arrastrando ? "select-none" : ""
      }`}
    >
      {abierto && (
        <div
          role="dialog"
          aria-label="Contacto"
          style={
            anclaje?.modo === "pantalla"
              ? {
                  position: "fixed",
                  left: anclaje.x,
                  top: anclaje.y,
                  width: anclaje.ancho,
                  maxHeight: anclaje.alto,
                }
              : {
                  left: anclaje?.x ?? 0,
                  width: anclaje?.ancho,
                  maxHeight: anclaje?.alto,
                  [anclaje?.debajo ? "top" : "bottom"]:
                    `calc(100% + ${HUECO}px)`,
                }
          }
          className="absolute z-10 overflow-y-auto overscroll-contain rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
        >
          {estado.ok ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                Mensaje enviado
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Te respondemos al correo que nos has dejado, normalmente el
                mismo día.
              </p>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="mt-1 text-sm font-medium text-cobra underline underline-offset-4"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <form action={accion} className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                  ¿Alguna duda?
                </p>
                <p className="text-xs text-neutral-500">
                  Escríbenos y te contestamos por correo.
                </p>
              </div>

              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Tu correo
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  className="mt-1 h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50"
                />
              </label>

              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Tu mensaje
                <textarea
                  name="message"
                  required
                  rows={4}
                  minLength={10}
                  maxLength={3000}
                  placeholder="Cuéntanos qué necesitas saber."
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50"
                />
              </label>

              {/* Trampa para bots: fuera de la vista y fuera del tabulador. */}
              <input
                type="text"
                name="empresa"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />

              <button
                type="submit"
                disabled={pendiente}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-cobra px-4 py-2 text-sm font-medium text-white transition hover:bg-cobra-oscuro disabled:opacity-60"
              >
                {pendiente && <Spinner className="h-4 w-4" />}
                {pendiente ? "Enviando…" : "Enviar"}
              </button>

              {estado.error && (
                <p className="text-xs text-red-600" role="alert">
                  {estado.error}
                </p>
              )}

              <p className="text-[11px] leading-relaxed text-neutral-400">
                Usamos tu correo solo para responderte. Más detalle en la{" "}
                <a href="/legal/privacidad" className="underline">
                  política de privacidad
                </a>
                .
              </p>
            </form>
          )}
        </div>
      )}

      <button
        type="button"
        onPointerDown={alBajar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        aria-label={abierto ? "Cerrar el contacto" : "Abrir el contacto"}
        aria-expanded={abierto}
        className={`flex h-14 w-14 touch-none items-center justify-center rounded-full bg-cobra text-white shadow-lg transition hover:bg-cobra-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra ${
          arrastrando ? "scale-105 cursor-grabbing" : "cursor-grab"
        }`}
      >
        {abierto ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
            <path
              d="M21 11.5a8.38 8.38 0 0 1-9 8.3 8.5 8.5 0 0 1-3.8-.9L3 20l1.1-4.1A8.38 8.38 0 0 1 3 11.5a8.5 8.5 0 0 1 9-8.3 8.38 8.38 0 0 1 9 8.3z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
}

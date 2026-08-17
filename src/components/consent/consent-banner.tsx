"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import type { Categorias } from "@/lib/consent";
import {
  guardarConsentimiento,
  leerConsentimiento,
  suscribirAbrirPreferencias,
  useConsent,
} from "@/lib/consent-store";

// Banner de consentimiento. Va montado en el layout raíz como hermano del
// píxel: `fixed` y fuera del flujo, así aparecer un frame tarde no mueve nada
// de la página (CLS = 0). Mientras el consentimiento es `undefined` —el
// prerender y la primera hidratación— no renderiza nada.
//
// Aceptar y rechazar son el mismo botón con distinto color: la AEPD exige que
// rechazar cueste exactamente un clic, igual que aceptar. El enlace de
// preferencias es para afinar, nunca el único camino para decir que no.
export function ConsentBanner() {
  const consent = useConsent();
  // El usuario ya decidió pero ha vuelto a abrir el panel desde un footer.
  const [reabierto, setReabierto] = useState(false);
  const [detalle, setDetalle] = useState(false);
  const [analitica, setAnalitica] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const tituloId = useId();
  const descripcionId = useId();

  useEffect(
    () =>
      suscribirAbrirPreferencias(() => {
        // Se parte de lo que ya eligió, no de los valores por defecto: si no,
        // "revisar mis preferencias" le cambiaría la decisión por la espalda.
        // Lectura puntual del store en vez de un effect de sincronización.
        const actual = leerConsentimiento();
        setAnalitica(actual?.analitica ?? true);
        setMarketing(actual?.marketing ?? false);
        setReabierto(true);
        setDetalle(true);
      }),
    [],
  );

  // Escape solo cierra si ya había una decisión guardada. En la primera visita
  // no hay nada que cerrar: no decidir equivale a rechazar y el banner se queda.
  useEffect(() => {
    if (!reabierto) return;
    function alPulsar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setReabierto(false);
        setDetalle(false);
      }
    }
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [reabierto]);

  if (consent === undefined) return null;
  if (consent !== null && !reabierto) return null;

  function decidir(opciones: Categorias) {
    guardarConsentimiento(opciones);
    setReabierto(false);
    setDetalle(false);
  }

  return (
    <div
      role="dialog"
      aria-labelledby={tituloId}
      aria-describedby={descripcionId}
      className="animate-rise fixed inset-x-0 bottom-0 z-50 border-t border-linea bg-papel"
    >
      <div className="mx-auto w-full max-w-5xl px-6 py-5">
        <h2 id={tituloId} className="font-display text-lg text-tinta">
          Cookies
        </h2>
        <p id={descripcionId} className="mt-2 text-sm leading-relaxed text-grafito">
          Usamos cookies propias para que funcione tu sesión, y cookies de
          terceros para medir la publicidad. Puedes aceptarlas, rechazarlas o
          elegir por categorías. Más detalle en la{" "}
          <Link
            href="/legal/cookies"
            className="text-cobra underline underline-offset-4"
          >
            política de cookies
          </Link>
          .
        </p>

        {detalle && (
          <ul className="mt-4 space-y-3 border-t border-linea pt-4">
            <li className="flex items-start gap-3">
              <input
                type="checkbox"
                checked
                disabled
                readOnly
                aria-label="Cookies necesarias (siempre activas)"
                className="mt-0.5 h-4 w-4 accent-cobra"
              />
              <span className="text-sm text-grafito">
                <strong className="font-semibold text-tinta">Necesarias</strong>{" "}
                — mantienen tu sesión iniciada y recuerdan esta misma decisión.
                Sin ellas la aplicación no funciona, así que están siempre
                activas.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <input
                id="consent-analitica"
                type="checkbox"
                checked={analitica}
                onChange={(evento) => setAnalitica(evento.target.checked)}
                className="mt-0.5 h-4 w-4 accent-cobra"
              />
              <label htmlFor="consent-analitica" className="text-sm text-grafito">
                <strong className="font-semibold text-tinta">Analítica</strong> —
                cuántas visitas recibe cada página. Datos agregados, sin
                identificarte.
              </label>
            </li>
            <li className="flex items-start gap-3">
              <input
                id="consent-marketing"
                type="checkbox"
                checked={marketing}
                onChange={(evento) => setMarketing(evento.target.checked)}
                className="mt-0.5 h-4 w-4 accent-cobra"
              />
              <label htmlFor="consent-marketing" className="text-sm text-grafito">
                <strong className="font-semibold text-tinta">Marketing</strong> —
                cookies de Meta (Facebook e Instagram) para saber qué anuncio te
                trajo hasta aquí y no volver a enseñarte el mismo.
              </label>
            </li>
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {detalle ? (
            <button
              type="button"
              onClick={() => decidir({ analitica, marketing })}
              className="rounded-lg bg-cobra px-4 py-2 text-sm font-medium text-marfil transition hover:bg-cobra-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra"
            >
              Guardar mi elección
            </button>
          ) : (
            <button
              type="button"
              onClick={() => decidir({ analitica: true, marketing: true })}
              className="rounded-lg bg-cobra px-4 py-2 text-sm font-medium text-marfil transition hover:bg-cobra-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra"
            >
              Aceptar todo
            </button>
          )}

          <button
            type="button"
            onClick={() => decidir({ analitica: false, marketing: false })}
            className="rounded-lg border border-linea bg-white px-4 py-2 text-sm font-medium text-tinta transition hover:border-musgo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra"
          >
            Rechazar todo
          </button>

          {!detalle && (
            <button
              type="button"
              onClick={() => setDetalle(true)}
              className="text-sm text-grafito/70 underline underline-offset-4 transition hover:text-cobra"
            >
              Preferencias
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

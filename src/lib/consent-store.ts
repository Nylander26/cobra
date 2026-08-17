"use client";

import { useSyncExternalStore } from "react";
import {
  type Categorias,
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  CONSENT_VERSION,
  type Consentimiento,
  parseConsent,
  serializeConsent,
} from "@/lib/consent";

// Banner y píxel son componentes HERMANOS en el layout raíz: no hay Provider
// porque envolver {children} arrastraría toda la app al cliente y mataría el
// prerender de la landing. Se comunican por eventos de `window`.
const EVENTO_CAMBIO = "cobra:consent";
const EVENTO_ABRIR = "cobra:consent:abrir";

// useSyncExternalStore exige que getSnapshot devuelva el MISMO objeto mientras
// no haya cambios: parsear en cada llamada crearía uno nuevo cada vez y React
// entraría en bucle de renders. Se cachea contra la cookie cruda.
let cache: { raw: string; valor: Consentimiento | null } | null = null;

function leerRaw(): string {
  const prefijo = `${CONSENT_COOKIE}=`;
  for (const trozo of document.cookie.split("; ")) {
    if (trozo.startsWith(prefijo)) return trozo.slice(prefijo.length);
  }
  return "";
}

function getSnapshot(): Consentimiento | null {
  const raw = leerRaw();
  if (!cache || cache.raw !== raw) cache = { raw, valor: parseConsent(raw) };
  return cache.valor;
}

// En el prerender no hay cookies. `undefined` significa "todavía no se sabe",
// que no es lo mismo que `null` ("no ha decidido"): con undefined el banner no
// pinta nada, así el HTML estático y la primera hidratación coinciden y no hay
// mismatch ni parpadeo.
function getServerSnapshot(): undefined {
  return undefined;
}

function subscribe(alCambiar: () => void) {
  window.addEventListener(EVENTO_CAMBIO, alCambiar);
  return () => window.removeEventListener(EVENTO_CAMBIO, alCambiar);
}

// Lectura puntual fuera de React, para handlers que necesitan el valor actual
// sin suscribirse ni arrastrar el estado por dependencias.
export function leerConsentimiento(): Consentimiento | null {
  return getSnapshot();
}

export function useConsent(): Consentimiento | null | undefined {
  return useSyncExternalStore<Consentimiento | null | undefined>(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
}

export function guardarConsentimiento(opciones: Categorias) {
  // Date.now() vive aquí, dentro del handler del clic. Con cacheComponents
  // está prohibido en module y render scope.
  const valor: Consentimiento = {
    v: CONSENT_VERSION,
    ts: Math.floor(Date.now() / 1000),
    ...opciones,
  };
  const seguro = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${serializeConsent(valor)}; Path=/; Max-Age=${CONSENT_MAX_AGE}; SameSite=Lax${seguro}`;
  window.dispatchEvent(new Event(EVENTO_CAMBIO));
}

// Retirar el consentimiento tiene que ser tan fácil como darlo: cualquier
// footer puede reabrir el panel sin conocer al banner ni compartir estado.
export function abrirPreferencias() {
  window.dispatchEvent(new Event(EVENTO_ABRIR));
}

export function suscribirAbrirPreferencias(alAbrir: () => void) {
  window.addEventListener(EVENTO_ABRIR, alAbrir);
  return () => window.removeEventListener(EVENTO_ABRIR, alAbrir);
}

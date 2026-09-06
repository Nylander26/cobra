"use client";

// Capa de navegador del píxel de Meta. El snippet se escribe a mano en vez de
// usar next/script porque solo se carga tras el consentimiento: montar y
// desmontar un <Script> condicional es frágil con el streaming de React, y
// aquí lo que hace falta es un orden determinista.

export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  loaded: boolean;
  version: string;
  push: unknown;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

// Cola que acepta llamadas antes de que fbevents.js termine de descargarse; la
// librería la vacía al cargar. Es el mismo contrato que el snippet oficial.
function crearCola(): Fbq {
  const fbq = ((...args: unknown[]) => {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  }) as Fbq;
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.push = fbq;
  return fbq;
}

// Estado propio del módulo. NO se usa `window.fbq` como señal de "ya cargado":
// las extensiones de depuración del píxel inyectan su propio `fbq` para
// espiar las llamadas, y ese stub hacía que esta función saliera por la puerta
// de atrás sin descargar fbevents.js ni llamar a `init` — los eventos se
// enviaban a un píxel que no existía ("Track event before pixel init").
let cargado = false;
let revocado = false;

// Una extensión (o cualquier script de terceros) puede haber dejado un `fbq`
// sin la forma que fbevents.js espera. Se normaliza para que la librería
// encuentre la cola y la vacíe al cargar, en vez de perder el `init`.
function asegurarCola(): Fbq {
  const existente = window.fbq;
  if (existente) {
    if (!Array.isArray(existente.queue)) {
      existente.queue = [];
      existente.loaded = true;
      existente.version = "2.0";
      existente.push = existente;
    }
    return existente;
  }
  const fbq = crearCola();
  window.fbq = fbq;
  window._fbq ??= fbq;
  return fbq;
}

// Idempotente: llamarla en cada navegación no vuelve a descargar nada.
export function cargarPixel(pixelId: string) {
  const fbq = asegurarCola();

  // Revocar y volver a conceder ocurre dentro de la misma página: sin este
  // `grant` explícito el píxel se quedaba mudo hasta una recarga completa,
  // porque `revoke` es pegajoso para el resto de la sesión.
  if (revocado) {
    fbq("consent", "grant");
    revocado = false;
  }

  if (cargado) return;
  cargado = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  fbq("init", pixelId);
}

// Retirar el consentimiento tiene que parar el tratamiento de verdad, no solo
// dejar de llamar a fbq: se le dice a Meta que revoque y se borran sus cookies.
export function revocarPixel() {
  // Sin esta guarda se emitía un `revoke` en cada navegación de quien no ha
  // aceptado marketing: ruido en el stream y borrado de cookies en bucle.
  if (revocado) return;
  revocado = true;
  window.fbq?.("consent", "revoke");
  for (const nombre of ["_fbp", "_fbc"]) {
    document.cookie = `${nombre}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}

export function trackPixel(
  nombre: string,
  parametros?: Record<string, unknown>,
  eventId?: string,
) {
  if (!window.fbq) return;
  window.fbq(
    "track",
    nombre,
    parametros ?? {},
    eventId ? { eventID: eventId } : undefined,
  );
}

// crypto.randomUUID() vive aquí, nunca en module o render scope: con
// cacheComponents está prohibido fuera de handlers y effects.
export function nuevoEventId(): string {
  return crypto.randomUUID();
}

// Doble canal con el MISMO event_id: Meta descarta el duplicado y se queda con
// el que llegue, así que el evento sobrevive tanto a un adblock (llega por
// servidor) como a un fallo de red del fetch (llega por el píxel).
//
// El id se genera aquí, en el navegador, y se transporta explícitamente. Nunca
// se recalcula en el servidor "con la misma fórmula": se desincroniza y Meta
// cuenta dos conversiones donde hay una.
export async function trackMeta(
  nombre: string,
  opciones: {
    customData?: Record<string, unknown>;
    email?: string;
  } = {},
) {
  const eventId = nuevoEventId();
  trackPixel(nombre, opciones.customData, eventId);

  try {
    await fetch("/api/meta/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: nombre, eventId, ...opciones }),
      // El alta navega justo después: sin esto el fetch se cancela a medias.
      keepalive: true,
    });
  } catch {
    // La medición nunca puede romper el flujo del usuario.
  }
}

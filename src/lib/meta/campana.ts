// Campaña de origen: de qué anuncio viene una visita. Módulo isomorfo a
// propósito, igual que `@/lib/consent`: lo escribe el navegador al aterrizar y
// lo lee el servidor en el hook de alta, y el formato tiene que ser el mismo.
//
// Existe porque Meta solo atribuye lo que Meta ve. El dato de "qué anuncio
// trajo este registro" tiene que vivir también en nuestra base de datos: es el
// único que sobrevive a un adblock, a iOS y a que Meta cambie de ventana de
// atribución a mitad de campaña.

export const CAMPANA_COOKIE = "cobra_campana";

// 30 días. Cubre de sobra la ventana de atribución de Meta (7 días de clic)
// sin convertirse en un rastro indefinido.
export const CAMPANA_MAX_AGE = 60 * 60 * 24 * 30;

// Solo parámetros de campaña. Nada de identificadores de persona: esto es
// "vienes del anuncio 3", no "eres tú".
export type Campana = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  // El clic de Facebook. Sirve para casar con `_fbc` si esa cookie se perdió.
  fbclid?: string;
};

const CLAVES: Array<[keyof Campana, string]> = [
  ["source", "utm_source"],
  ["medium", "utm_medium"],
  ["campaign", "utm_campaign"],
  ["content", "utm_content"],
  ["term", "utm_term"],
  ["fbclid", "fbclid"],
];

// Recorte defensivo: estos valores llegan de una URL que cualquiera puede
// escribir, y acaban en una fila de base de datos.
const MAX_LARGO = 120;

function limpiar(valor: string | null): string | undefined {
  if (!valor) return undefined;
  const recortado = valor.trim().slice(0, MAX_LARGO);
  return recortado || undefined;
}

export function campanaDeQuery(params: URLSearchParams): Campana | null {
  const campana: Campana = {};
  for (const [clave, param] of CLAVES) {
    const valor = limpiar(params.get(param));
    if (valor) campana[clave] = valor;
  }
  return Object.keys(campana).length > 0 ? campana : null;
}

export function serializeCampana(campana: Campana): string {
  return encodeURIComponent(JSON.stringify(campana));
}

export function parseCampana(raw: string | null | undefined): Campana | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    const campana: Campana = {};
    for (const [clave] of CLAVES) {
      const valor = data[clave];
      if (typeof valor === "string") {
        const limpio = limpiar(valor);
        if (limpio) campana[clave] = limpio;
      }
    }
    return Object.keys(campana).length > 0 ? campana : null;
  } catch {
    return null;
  }
}

// Lee la cookie de una cabecera `Cookie` cruda, para los sitios donde no hay
// `cookies()` de Next: los hooks de Better-Auth, por ejemplo.
export function campanaDeCookie(cookie: string | null | undefined): Campana | null {
  if (!cookie) return null;
  const prefijo = `${CAMPANA_COOKIE}=`;
  for (const trozo of cookie.split("; ")) {
    if (trozo.startsWith(prefijo)) return parseCampana(trozo.slice(prefijo.length));
  }
  return null;
}

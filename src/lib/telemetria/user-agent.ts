import { campanaDeCookie } from "@/lib/meta/campana";

// Una línea por visita en los logs del servidor con el navegador que la trae y
// la campaña de la que viene. No se persiste en base de datos: es material para
// leer mientras una campaña está viva, no un histórico.
//
// El User-Agent es un dato personal. Aquí solo pasa por el log del servidor,
// con la retención de la plataforma; no viaja a ningún tercero ni se guarda
// junto a la cuenta del usuario.
export function registrarUserAgent(
  punto: string,
  cabeceras: Headers,
  extra?: Record<string, string | undefined>,
) {
  const campana = campanaDeCookie(cabeceras.get("cookie"));

  const campos: Record<string, string | undefined> = {
    ua: cabeceras.get("user-agent") ?? "-",
    // Sugerencias de cliente: las manda Chromium y contestan "¿es móvil?" sin
    // interpretar la cadena del User-Agent, que miente por diseño.
    movil: cabeceras.get("sec-ch-ua-mobile") ?? "-",
    plataforma: cabeceras.get("sec-ch-ua-platform") ?? "-",
    campana: campana?.campaign ?? "-",
    origen: campana?.source ?? "-",
    ...extra,
  };

  const detalle = Object.entries(campos)
    .filter(([, valor]) => valor !== undefined)
    // Las comillas vienen de una cabecera que escribe el cliente: sin escapar,
    // una sola rompe el formato de la línea entera.
    .map(([clave, valor]) => `${clave}="${valor?.replaceAll('"', "'")}"`)
    .join(" ");

  console.log(`[ua] punto=${punto} ${detalle}`);
}

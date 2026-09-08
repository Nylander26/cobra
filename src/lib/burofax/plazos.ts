// Los plazos legales que gobiernan qué pasa DESPUÉS de enviar el burofax.
//
// Van aquí, con nombre y con su artículo, y no incrustados en el código que
// calcula fechas: son lo primero que un abogado tiene que poder leer y
// corregir sin bucear en la lógica, y lo primero que cambia cuando cambia la
// ley. Todo en días naturales.
//
// PENDIENTE DE REVISIÓN JURÍDICA antes de publicar el generador. Las cifras de
// abajo son las vigentes según la redacción actual, pero la responsabilidad de
// confirmarlas no puede recaer en quien escribe el código.

const DIA = 86_400_000;

// Plazo que se le da al deudor dentro de la propia carta para pagar antes de
// pasar a la vía judicial. Diez días naturales es lo habitual: suficiente para
// que no se pueda alegar indefensión, corto para que el requerimiento no
// pierda fuerza.
export const PLAZO_PAGO_DIAS = 10;

// Art. 1964.2 CC: las acciones personales sin plazo especial prescriben a los
// cinco años. Art. 1973 CC: la reclamación extrajudicial fehaciente —esto es,
// el burofax— interrumpe la prescripción y el cómputo vuelve a empezar de cero
// desde ese día. Es el efecto más valioso de todo el trámite.
export const PRESCRIPCION_ANIOS = 5;

// Se avisa con tres meses de margen: el aviso llega a tiempo de volver a
// interrumpirla, que es lo único que se puede hacer a esas alturas.
export const AVISO_PRESCRIPCION_MESES_ANTES = 3;

// Art. 80.Cuatro LIVA, en la redacción de la Ley 31/2022 (efectos desde el
// 1-1-2023). Dos plazos encadenados que la gente confunde constantemente:
//
//   1. El crédito no se considera incobrable hasta que han pasado seis meses
//      desde el devengo del IVA repercutido sin haber obtenido el cobro.
//   2. Desde que termina ese periodo se abre una ventana de seis meses para
//      emitir la factura rectificativa y modificar la base imponible. Pasada
//      la ventana, el IVA adelantado a Hacienda no se recupera.
//
// La misma reforma es la que permite acreditar la reclamación por "cualquier
// medio que acredite fehacientemente" el requerimiento de cobro al deudor, en
// lugar de exigir reclamación judicial o requerimiento notarial. Por eso el
// burofax vale, y por eso este aviso tiene sentido dentro de este flujo.
export const IVA_MESES_HASTA_INCOBRABLE = 6;
export const IVA_MESES_VENTANA_RECTIFICACION = 6;

// Cuánto se espera tras vencer el plazo de la carta antes de sugerir el
// proceso monitorio. Un mes: si a esas alturas no ha pagado ni ha contestado,
// no va a hacerlo por su cuenta.
export const MONITORIO_DIAS_TRAS_PLAZO = 30;

export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getTime() + dias * DIA);
}

// Aritmética de meses, no de 30 días: los plazos fiscales se cuentan de fecha
// a fecha. Se usa UTC en todo el módulo porque las fechas del burofax son días
// del calendario, no instantes.
export function sumarMeses(fecha: Date, meses: number): Date {
  const d = new Date(fecha);
  const diaOriginal = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + meses);
  // 31 de enero + 1 mes no es el 3 de marzo: se recorta al último día del mes.
  if (d.getUTCDate() < diaOriginal) d.setUTCDate(0);
  return d;
}

export function sumarAnios(fecha: Date, anios: number): Date {
  return sumarMeses(fecha, anios * 12);
}

// Fecha límite para modificar la base imponible y recuperar el IVA de una
// factura impagada, contada desde el devengo (la fecha de emisión).
export function limiteRecuperacionIva(emitidaEl: Date): Date {
  return sumarMeses(
    emitidaEl,
    IVA_MESES_HASTA_INCOBRABLE + IVA_MESES_VENTANA_RECTIFICACION,
  );
}

// Desde cuándo se puede pedir esa recuperación: antes de esta fecha el crédito
// todavía no es incobrable a efectos del artículo.
export function aperturaRecuperacionIva(emitidaEl: Date): Date {
  return sumarMeses(emitidaEl, IVA_MESES_HASTA_INCOBRABLE);
}

export function formatearFecha(fecha: Date): string {
  return fecha.toLocaleDateString("es-ES", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

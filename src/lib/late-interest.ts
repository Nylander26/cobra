// Intereses de demora — Ley 3/2004 de lucha contra la morosidad en operaciones
// comerciales. El tipo legal = tipo del BCE (última operación principal de
// financiación del semestre anterior) + 8 puntos, publicado cada semestre en el
// BOE por la Secretaría General del Tesoro.
//
// Fuente de la tabla: Banco de España (tabla de tipos de interés de demora para
// operaciones comerciales). ACTUALIZAR cada semestre añadiendo una línea.
const RATES: Record<string, number> = {
  "2013-1": 7.75, "2013-2": 8.75,
  "2014-1": 8.25, "2014-2": 8.15,
  "2015-1": 8.05, "2015-2": 8.05,
  "2016-1": 8.05, "2016-2": 8.0,
  "2017-1": 8.0, "2017-2": 8.0,
  "2018-1": 8.0, "2018-2": 8.0,
  "2019-1": 8.0, "2019-2": 8.0,
  "2020-1": 8.0, "2020-2": 8.0,
  "2021-1": 8.0, "2021-2": 8.0,
  "2022-1": 8.0, "2022-2": 8.0,
  "2023-1": 10.5, "2023-2": 12.0,
  "2024-1": 12.5, "2024-2": 12.25,
  "2025-1": 11.15, "2025-2": 10.15,
  "2026-1": 10.15, "2026-2": 10.4,
};

// Compensación fija por costes de cobro (art. 8 Ley 3/2004): 40 € por deuda.
export const RECOVERY_COMPENSATION_CENTS = 4000;

const KEYS = Object.keys(RATES).sort();
const EARLIEST = KEYS[0];
const LATEST = KEYS[KEYS.length - 1];
const DAY = 86400000;

const halfOf = (d: Date): 1 | 2 => (d.getUTCMonth() <= 5 ? 1 : 2);
const keyOf = (d: Date): string => `${d.getUTCFullYear()}-${halfOf(d)}`;

// Inicio (exclusivo) del siguiente semestre al que contiene `d`, en UTC.
function semesterEnd(d: Date): Date {
  const y = d.getUTCFullYear();
  return halfOf(d) === 1
    ? new Date(Date.UTC(y, 6, 1))
    : new Date(Date.UTC(y + 1, 0, 1));
}

// Tipo aplicable a la fecha. Fuera de la tabla (muy antiguo o futuro sin
// publicar) usa el extremo más cercano y marca el resultado como estimado.
function rateFor(d: Date): { rate: number; estimated: boolean } {
  const k = keyOf(d);
  if (RATES[k] != null) return { rate: RATES[k], estimated: false };
  const fallback = k < EARLIEST ? RATES[EARLIEST] : RATES[LATEST];
  return { rate: fallback, estimated: true };
}

export type InterestSegment = {
  periodo: string;
  tipo: number;
  dias: number;
  interesCents: number;
  estimated: boolean;
};

export type LateInterest = {
  dias: number;
  interesCents: number;
  compensacionCents: number;
  totalCents: number; // intereses + compensación (extra reclamable sobre el principal)
  segments: InterestSegment[];
  estimated: boolean;
};

const ZERO: LateInterest = {
  dias: 0,
  interesCents: 0,
  compensacionCents: 0,
  totalCents: 0,
  segments: [],
  estimated: false,
};

// Interés de demora devengado desde el día siguiente al vencimiento hasta
// `asOf`, aplicando el tipo legal de cada semestre a los días que caen en él
// (base 365). Añade la compensación fija de 40 € si hay mora.
export function computeLateInterest(
  amountCents: number,
  dueDate: Date,
  asOf: Date,
): LateInterest {
  const start = new Date(dueDate.getTime() + DAY); // día siguiente al vencimiento
  if (asOf <= start || amountCents <= 0) return ZERO;

  let cursor = start;
  let interest = 0;
  let estimated = false;
  const segments: InterestSegment[] = [];

  while (cursor < asOf) {
    const segEnd = new Date(
      Math.min(semesterEnd(cursor).getTime(), asOf.getTime()),
    );
    const dias = Math.round((segEnd.getTime() - cursor.getTime()) / DAY);
    const r = rateFor(cursor);
    const segInterest = amountCents * (r.rate / 100) * (dias / 365);
    interest += segInterest;
    estimated ||= r.estimated;
    segments.push({
      periodo: `${cursor.getUTCFullYear()} S${halfOf(cursor)}`,
      tipo: r.rate,
      dias,
      interesCents: Math.round(segInterest),
      estimated: r.estimated,
    });
    cursor = segEnd;
  }

  const interesCents = Math.round(interest);
  return {
    dias: Math.round((asOf.getTime() - start.getTime()) / DAY),
    interesCents,
    compensacionCents: RECOVERY_COMPENSATION_CENTS,
    totalCents: interesCents + RECOVERY_COMPENSATION_CENTS,
    segments,
    estimated,
  };
}

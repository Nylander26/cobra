import { parseAmountToCents } from "@/lib/money";
import { PLAZO_PAGO_DIAS } from "./plazos";

// Los datos que necesita una reclamación fehaciente para producir sus efectos:
// identificar sin ambigüedad a las dos partes, identificar la deuda concreta, y
// requerir el pago con un plazo. Nada más y nada menos — cada campo de aquí
// está porque sin él la carta pierde fuerza probatoria.

export type Parte = {
  // Nombre y apellidos o razón social, tal y como figura en la factura.
  nombre: string;
  nif: string;
  // Dirección completa en una sola caja: es lo que se copia en el sobre.
  domicilio: string;
};

export type BurofaxPayload = {
  acreedor: Parte;
  deudor: Parte;
  factura: {
    numero: string;
    emitidaEl: Date;
    venceEl: Date;
    concepto: string;
    importeCents: number;
  };
  plazoDias: number;
};

// Validación manual, sin Zod: es la misma disciplina del resto del repo y aquí
// además hace falta un mensaje escrito para cada campo. Un formulario de doce
// campos que responde "datos inválidos" se abandona.
export type ErroresBurofax = Record<string, string>;

const NIF_FORMATO = /^[0-9XYZ][0-9]{7}[A-Z]$/;
const CIF_FORMATO = /^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/;
const LETRAS_DNI = "TRWAGMYFPDXBNJZSQVHLCKE";

export function normalizarNif(valor: string): string {
  return valor.toUpperCase().replace(/[\s-]/g, "");
}

// El dígito de control del DNI/NIE es un módulo 23 sin ninguna ambigüedad, así
// que comprobarlo no rechaza ningún documento real y sí caza la errata que
// dejaría el burofax dirigido a nadie. El del CIF tiene dos variantes según la
// letra inicial y no se comprueba: se acepta por forma.
export function nifValido(valor: string): boolean {
  const nif = normalizarNif(valor);
  if (CIF_FORMATO.test(nif)) return true;
  if (!NIF_FORMATO.test(nif)) return false;
  const numero = Number(
    nif.slice(0, 8).replace(/^X/, "0").replace(/^Y/, "1").replace(/^Z/, "2"),
  );
  return LETRAS_DNI[numero % 23] === nif[8];
}

function texto(valor: FormDataEntryValue | null): string {
  return String(valor ?? "").trim();
}

function fecha(valor: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const d = new Date(`${valor}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function exigirParte(
  form: FormData,
  prefijo: "acreedor" | "deudor",
  errores: ErroresBurofax,
  etiquetas: { nombre: string; nif: string; domicilio: string },
): Parte {
  const nombre = texto(form.get(`${prefijo}Nombre`));
  const nif = normalizarNif(texto(form.get(`${prefijo}Nif`)));
  const domicilio = texto(form.get(`${prefijo}Domicilio`));

  if (nombre.length < 2) errores[`${prefijo}Nombre`] = etiquetas.nombre;
  if (!nifValido(nif)) errores[`${prefijo}Nif`] = etiquetas.nif;
  if (domicilio.length < 10) errores[`${prefijo}Domicilio`] = etiquetas.domicilio;

  return { nombre, nif, domicilio };
}

// Devuelve el payload solo si está entero. Se llama en el servidor sobre lo que
// llega del formulario: lo que manda el navegador son datos de entrada, nunca
// un resultado ya validado.
export function parsearBurofax(
  form: FormData,
  ahora: Date,
):
  | { ok: true; payload: BurofaxPayload }
  | { ok: false; errores: ErroresBurofax } {
  const errores: ErroresBurofax = {};

  const acreedor = exigirParte(form, "acreedor", errores, {
    nombre: "Escribe tu nombre o razón social, como figura en la factura.",
    nif: "Ese NIF no es válido. Revísalo: sin él la reclamación no te identifica.",
    domicilio: "Escribe tu domicilio completo, con calle, número y localidad.",
  });

  const deudor = exigirParte(form, "deudor", errores, {
    nombre: "Escribe el nombre o la razón social de quien te debe.",
    nif: "Ese NIF no es válido. Lo tienes en la factura que le emitiste.",
    domicilio:
      "Escribe el domicilio del deudor. Es la dirección a la que Correos entregará el burofax.",
  });

  const numero = texto(form.get("numero"));
  if (numero.length < 1) errores.numero = "Escribe el número de la factura.";

  const concepto = texto(form.get("concepto"));
  if (concepto.length < 3) {
    errores.concepto =
      "Describe brevemente el trabajo facturado (por ejemplo: diseño de identidad corporativa).";
  }

  const importeCents = parseAmountToCents(texto(form.get("importe")));
  if (!importeCents || importeCents <= 0) {
    errores.importe = "Escribe el importe total de la factura, IVA incluido.";
  }

  const emitidaEl = fecha(texto(form.get("emision")));
  if (!emitidaEl) errores.emision = "Escribe la fecha de emisión de la factura.";

  const venceEl = fecha(texto(form.get("vencimiento")));
  if (!venceEl) {
    errores.vencimiento = "Escribe la fecha de vencimiento de la factura.";
  } else if (venceEl >= ahora) {
    // Sin mora no hay nada que reclamar todavía, y el burofax sería prematuro.
    errores.vencimiento =
      "Esa factura aún no ha vencido: todavía no hay deuda que reclamar.";
  } else if (emitidaEl && venceEl < emitidaEl) {
    errores.vencimiento =
      "El vencimiento no puede ser anterior a la fecha de emisión.";
  }

  const plazoBruto = Number(texto(form.get("plazo")) || PLAZO_PAGO_DIAS);
  const plazoDias =
    Number.isInteger(plazoBruto) && plazoBruto >= 5 && plazoBruto <= 30
      ? plazoBruto
      : PLAZO_PAGO_DIAS;

  if (Object.keys(errores).length > 0) return { ok: false, errores };

  return {
    ok: true,
    payload: {
      acreedor,
      deudor,
      factura: {
        numero,
        // Los non-null son seguros: si faltaran, `errores` no estaría vacío.
        emitidaEl: emitidaEl!,
        venceEl: venceEl!,
        concepto,
        importeCents: importeCents!,
      },
      plazoDias,
    },
  };
}

// Ida y vuelta por JSON para guardar el borrador cifrado: `Date` no sobrevive a
// JSON.stringify y volvería como string, rompiendo el cálculo de intereses al
// rehidratar.
export type BurofaxPayloadPlano = Omit<BurofaxPayload, "factura"> & {
  factura: Omit<BurofaxPayload["factura"], "emitidaEl" | "venceEl"> & {
    emitidaEl: string;
    venceEl: string;
  };
};

export function aPlano(payload: BurofaxPayload): BurofaxPayloadPlano {
  return {
    ...payload,
    factura: {
      ...payload.factura,
      emitidaEl: payload.factura.emitidaEl.toISOString(),
      venceEl: payload.factura.venceEl.toISOString(),
    },
  };
}

export function deTexto(plano: BurofaxPayloadPlano): BurofaxPayload {
  return {
    ...plano,
    factura: {
      ...plano.factura,
      emitidaEl: new Date(plano.factura.emitidaEl),
      venceEl: new Date(plano.factura.venceEl),
    },
  };
}

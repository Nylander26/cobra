import { computeLateInterest, type LateInterest } from "@/lib/late-interest";
import { formatCents } from "@/lib/money";
import type { BurofaxPayload } from "./schema";
import {
  aperturaRecuperacionIva,
  formatearFecha,
  limiteRecuperacionIva,
  sumarDias,
} from "./plazos";

// La carta. Es la feature entera: el PDF no es más que este texto puesto en
// una hoja, y el valor del generador está en que diga exactamente lo que tiene
// que decir para producir sus efectos jurídicos.
//
// Tres cosas no se pueden tocar sin romperla:
//
//   1. El REQUERIMIENTO EXPRESO DE PAGO con un plazo cierto. Sin él la carta
//      es una queja, no una reclamación, y no interrumpe la prescripción
//      (art. 1973 CC). Es el error que convierte un burofax de 35 € en nada.
//   2. La identificación inequívoca de la deuda: número de factura, fecha,
//      concepto e importe. Una reclamación genérica no acredita qué se reclama.
//   3. La identificación de ambas partes con NIF y domicilio.
//
// El tono es el de un requerimiento formal, no el de un recordatorio. A estas
// alturas del proceso la cordialidad ya se ha gastado en los tres correos
// anteriores, y una carta certificada que suena a súplica invita a seguir sin
// pagar.

export type CartaBurofax = {
  fecha: string;
  asunto: string;
  remitente: string[];
  destinatario: string[];
  parrafos: string[];
  despedida: string;
  firma: string[];
  // Desglose numérico, aparte del cuerpo: en el PDF va como tabla.
  desglose: {
    conceptos: { etiqueta: string; valor: string; nota?: string }[];
    totalEtiqueta: string;
    total: string;
  };
  interes: LateInterest;
  // La línea del IVA, que es media feature gratis: el mismo trámite que
  // interrumpe la prescripción es el que acredita la reclamación para
  // recuperar el IVA ya adelantado a Hacienda.
  iva: { desde: string; hasta: string };
  venceElPlazo: Date;
};

function lineasDomicilio(valor: string): string[] {
  return valor
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function construirCarta(
  payload: BurofaxPayload,
  ahora: Date,
): CartaBurofax {
  const { acreedor, deudor, factura, plazoDias } = payload;
  const interes = computeLateInterest(
    factura.importeCents,
    factura.venceEl,
    ahora,
  );
  const venceElPlazo = sumarDias(ahora, plazoDias);
  const totalCents = factura.importeCents + interes.totalCents;

  const parrafos = [
    `Me dirijo a usted en relación con la factura número ${factura.numero}, emitida el ${formatearFecha(factura.emitidaEl)} por un importe de ${formatCents(factura.importeCents)}, correspondiente a ${factura.concepto}, cuyo vencimiento se produjo el ${formatearFecha(factura.venceEl)} sin que a fecha de hoy se haya recibido el pago.`,

    `Han transcurrido ${interes.dias} días naturales desde el vencimiento. Conforme a los artículos 5 y 6 de la Ley 3/2004, de 29 de diciembre, por la que se establecen medidas de lucha contra la morosidad en las operaciones comerciales, la deuda devenga intereses de demora de forma automática desde el día siguiente al vencimiento, sin necesidad de aviso previo ni de pacto expreso, al tipo legal publicado semestralmente en el Boletín Oficial del Estado. A ello se añade la compensación fija de ${formatCents(interes.compensacionCents)} por costes de cobro que reconoce el artículo 8 de la misma ley, sin necesidad de justificación alguna.`,

    `En consecuencia, LE REQUIERO EXPRESAMENTE para que, en el plazo improrrogable de ${plazoDias} días naturales a contar desde la recepción de la presente —esto es, hasta el ${formatearFecha(venceElPlazo)}—, proceda al pago íntegro de la cantidad de ${formatCents(totalCents)}, comprensiva del principal adeudado, los intereses de demora devengados hasta la fecha y la compensación por costes de cobro, según el desglose que figura a continuación.`,

    `Le advierto de que, transcurrido dicho plazo sin haber hecho efectivo el pago, procederé a reclamar judicialmente la deuda por la vía que corresponda, incluido el proceso monitorio previsto en los artículos 812 y siguientes de la Ley 1/2000, de Enjuiciamiento Civil, reclamando asimismo los intereses que se sigan devengando hasta el completo pago y las costas que se generen, sin necesidad de nuevo requerimiento.`,

    `Sirva la presente comunicación de requerimiento fehaciente de pago a todos los efectos legales oportunos y, en particular, a los previstos en el artículo 1973 del Código Civil, quedando interrumpido el plazo de prescripción de la acción de reclamación de la deuda desde la fecha de su recepción.`,
  ];

  return {
    fecha: formatearFecha(ahora),
    asunto: `Requerimiento fehaciente de pago — factura n.º ${factura.numero}`,
    remitente: [
      acreedor.nombre,
      `NIF ${acreedor.nif}`,
      ...lineasDomicilio(acreedor.domicilio),
    ],
    destinatario: [
      deudor.nombre,
      `NIF ${deudor.nif}`,
      ...lineasDomicilio(deudor.domicilio),
    ],
    parrafos,
    despedida:
      "A la espera de que atienda el presente requerimiento en el plazo señalado y evitemos así la vía judicial, reciba un atento saludo.",
    firma: [acreedor.nombre, `NIF ${acreedor.nif}`],
    desglose: {
      conceptos: [
        {
          etiqueta: `Principal — factura n.º ${factura.numero}`,
          valor: formatCents(factura.importeCents),
          nota: `Vencida el ${formatearFecha(factura.venceEl)}`,
        },
        {
          etiqueta: "Intereses de demora (arts. 5 a 7, Ley 3/2004)",
          valor: formatCents(interes.interesCents),
          nota: `${interes.dias} días de mora, tipo legal de cada semestre`,
        },
        {
          etiqueta: "Costes de cobro (art. 8, Ley 3/2004)",
          valor: formatCents(interes.compensacionCents),
          nota: "Cantidad fija, sin necesidad de justificación",
        },
      ],
      totalEtiqueta: "Total requerido",
      total: formatCents(totalCents),
    },
    interes,
    iva: {
      desde: formatearFecha(aperturaRecuperacionIva(factura.emitidaEl)),
      hasta: formatearFecha(limiteRecuperacionIva(factura.emitidaEl)),
    },
    venceElPlazo,
  };
}

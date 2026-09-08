// Correo que recibe quien usa la calculadora de intereses de demora y deja su
// dirección. Su trabajo es doble: entregar de verdad lo que se prometió —el
// desglose, para poder pegarlo en una reclamación— y ser la primera prueba de
// que los correos de Cobra llegan y están bien hechos.

import { escapeHtml, renderCobraEmail } from "@/lib/email/cobra-template";
import type { LateInterest } from "@/lib/late-interest";
import { formatCents } from "@/lib/money";

const MARFIL = "#EDF1E7";
const MUSGO = "#8FA89A";
const GRAFITO = "#24322B";
const TINTA = "#12241C";

const MONO = "'Courier New', Courier, monospace";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export type BuiltEmail = { subject: string; text: string; html: string };

function fila(label: string, value: string, destacado = false): string {
  return `<tr>
    <td style="padding:7px 0; font-family:${SANS}; font-size:13px; color:${MUSGO};">${escapeHtml(label)}</td>
    <td align="right" style="padding:7px 0; font-family:${SANS}; font-size:${destacado ? "16px" : "13px"}; font-weight:${destacado ? "700" : "400"}; color:${destacado ? TINTA : GRAFITO};">${escapeHtml(value)}</td>
  </tr>`;
}

function fecha(d: Date): string {
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function buildCalculoEmail(input: {
  amountCents: number;
  dueDate: Date;
  result: LateInterest;
  ctaUrl: string;
}): BuiltEmail {
  const { amountCents, dueDate, result, ctaUrl } = input;
  const total = formatCents(result.totalCents);

  const subject = `Puedes reclamar ${total} además de tu factura`;

  const text = [
    `Este es el desglose que has calculado en micobra.es:`,
    "",
    `Importe de la factura: ${formatCents(amountCents)}`,
    `Vencimiento: ${fecha(dueDate)}`,
    `Días de mora: ${result.dias}`,
    `Intereses de demora: ${formatCents(result.interesCents)}`,
    `Costes de cobro (art. 8 Ley 3/2004): ${formatCents(result.compensacionCents)}`,
    `Total reclamable además de la factura: ${total}`,
    "",
    "Los intereses de demora se devengan solos desde el día siguiente al",
    "vencimiento, sin necesidad de reclamarlos antes ni de pactarlos en el",
    "contrato. Los 40 € de compensación por costes de cobro son fijos por",
    "factura y no admiten pacto en contra.",
    "",
    "Reclamarlo es otra historia: hay que escribir, insistir y llevar la cuenta",
    "de los días. Cobra lo hace por ti — envía los recordatorios desde tu propio",
    "correo, con tu nombre, hasta que te pagan.",
    "",
    ctaUrl,
  ].join("\n");

  const blockHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:2px 0 20px;">
  <tr>
    <td bgcolor="${MARFIL}" style="border-radius:8px; padding:14px 18px;">
      <p style="margin:0 0 6px; font-family:${MONO}; font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:${MUSGO};">Tu cálculo</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${fila("Importe de la factura", formatCents(amountCents))}
        ${fila("Vencimiento", fecha(dueDate))}
        ${fila("Días de mora", String(result.dias))}
        ${fila("Intereses de demora", formatCents(result.interesCents))}
        ${fila("Costes de cobro (art. 8)", formatCents(result.compensacionCents))}
        ${fila("Total reclamable extra", total, true)}
      </table>
    </td>
  </tr>
</table>`;

  const html = renderCobraEmail({
    preheader: `Intereses, compensación de 40 € y días de mora de tu factura.`,
    eyebrow: "Calculadora de intereses de demora",
    heading: `Puedes reclamar ${total} además de la factura`,
    blockHtml,
    paragraphs: [
      "Los intereses de demora se devengan solos desde el día siguiente al vencimiento: no hace falta haberlos pactado ni haberlos reclamado antes. Los 40 € de compensación por costes de cobro son fijos por factura y no admiten pacto en contra (art. 8 de la Ley 3/2004).",
      "Reclamarlo es la parte pesada: escribir, insistir y llevar la cuenta de los días. Cobra lo hace por ti — envía los recordatorios desde tu propio correo y con tu nombre, hasta que te pagan.",
      result.estimated
        ? "El tipo legal de alguno de los semestres todavía no está publicado en el BOE; para esos días se ha usado el último tipo conocido, así que la cifra puede variar unos céntimos."
        : "Tipos legales publicados en el BOE para cada semestre; el cálculo aplica el de cada tramo de días.",
    ],
    cta: { label: "Reclamar mis facturas con Cobra", url: ctaUrl },
    footer:
      "Recibes este correo porque pediste el cálculo en micobra.es. No te hemos apuntado a ninguna lista: si no vuelves a pedirlo, no volveremos a escribirte.",
  });

  return { subject, text, html };
}

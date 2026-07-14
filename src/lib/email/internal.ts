// Correos internos de Cobra AL OWNER (soporte y avisos de operaciones).
// Misma familia visual que cobra-template ("tinta y ley"): la banda de tinta
// y el eyebrow mono son la firma; el bloque interior da el carácter de cada
// uno — ficha de expediente para soporte, log de terminal para ops. Builders
// puros (sin BD ni env) para poder previsualizarlos y auditarlos aislados.

import { escapeHtml, renderCobraEmail } from "@/lib/email/cobra-template";

const TINTA = "#12241C";
const MARFIL = "#EDF1E7";
const MUSGO = "#8FA89A";
const GRAFITO = "#24322B";

const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "'Courier New', Courier, monospace";

export type BuiltEmail = { subject: string; text: string; html: string };

// Texto multilinea del usuario → HTML escapado con saltos preservados.
function multiline(value: string): string {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

function metaRow(label: string, value: string): string {
  return `<div style="margin:0 0 6px;">
    <span style="display:inline-block; min-width:76px; font-family:${MONO}; font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:${MUSGO};">${escapeHtml(label)}</span>
    <span style="font-family:${MONO}; font-size:13px; color:${GRAFITO}; word-break:break-all;">${escapeHtml(value)}</span>
  </div>`;
}

// Mensaje del formulario de soporte → bandeja del owner. La cabecera es el
// remitente (quién pregunta es lo que importa para el triaje); la ficha mono
// da los datos de la cuenta de un vistazo; el mensaje va citado con regla de
// tinta. Sin CTA: el reply-to ya apunta al usuario.
export function buildSupportEmail(input: {
  type: string; // "Sugerencia" | "Problema" | "Pregunta"
  userName: string;
  userEmail: string;
  userId: string;
  planName: string;
  message: string;
}): BuiltEmail {
  const text = [
    `Tipo: ${input.type}`,
    `De: ${input.userName} <${input.userEmail}>`,
    `Usuario: ${input.userId}`,
    `Plan: ${input.planName}`,
    "",
    input.message,
  ].join("\n");

  const blockHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:2px 0 20px;">
  <tr>
    <td bgcolor="${MARFIL}" style="border-radius:8px; padding:14px 16px 9px;">
      ${metaRow("Email", input.userEmail)}
      ${metaRow("Usuario", input.userId)}
      ${metaRow("Plan", input.planName)}
    </td>
  </tr>
</table>
<div style="border-left:3px solid ${TINTA}; padding:2px 0 2px 16px;">
  <p style="margin:0; font-family:${SANS}; font-size:15px; line-height:1.7; color:${GRAFITO};">${multiline(input.message)}</p>
</div>`;

  return {
    subject: `[Cobra soporte] ${input.type} — ${input.userName}`,
    text,
    html: renderCobraEmail({
      preheader: input.message.slice(0, 90),
      eyebrow: `Soporte — ${input.type}`,
      heading: input.userName,
      blockHtml,
      footer: `Mensaje enviado desde el formulario de soporte del panel. Responde a este correo y le llegará directamente a ${input.userEmail}.`,
    }),
  };
}

// Aviso de operaciones (fallos de cron, envíos fallidos, topes de abuso).
// El bloque es un log mono sobre tinta: separa a la vista "informe de
// máquina" de "carta de persona" dentro de la misma familia.
export function buildOpsAlertEmail(
  subject: string,
  lines: string[],
): BuiltEmail {
  const text = `${lines.join("\n")}\n\nEventos completos en la tabla events (reminder_failed / reminder_capped).\n`;

  const log = lines
    .map(
      (l) =>
        `<div style="font-family:${MONO}; font-size:13px; line-height:1.8; color:${MARFIL}; word-break:break-word;">${escapeHtml(l)}</div>`,
    )
    .join("\n");

  const blockHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:2px 0 4px;">
  <tr>
    <td bgcolor="${TINTA}" style="border-radius:8px; padding:16px 18px;">
      ${log}
    </td>
  </tr>
</table>`;

  return {
    subject: `[Cobra ops] ${subject}`,
    text,
    html: renderCobraEmail({
      preheader: lines[0] ?? subject,
      eyebrow: "Operaciones",
      heading: subject,
      blockHtml,
      footer:
        "Aviso automático de los crons de Cobra. Los eventos completos quedan en la tabla events (reminder_failed / reminder_capped).",
    }),
  };
}

// Plantilla de los correos transaccionales de Cobra A SUS USUARIOS
// (verificación, contraseña, resumen semanal). Estética de la app ("tinta y
// ley"): banda de cabecera en tinta con wordmark serif + eyebrow mono en
// musgo, cuerpo sans grafito en tarjeta blanca, CTA verde cobra, ámbar solo
// para demora. No confundir con src/lib/email/html.ts: esa es la plantilla
// white-label de los RECORDATORIOS, que llevan la marca del usuario.
//
// Reglas email-client: tablas + estilos inline, sin webfonts (serif =
// Georgia, mono = Courier), botón a prueba de Outlook (td con bgcolor),
// color-scheme light fijado, preheader oculto, 560px con padding fluido.

const TINTA = "#12241C";
const PAPEL = "#F4F5EF";
const MARFIL = "#EDF1E7";
const MUSGO = "#8FA89A";
const COBRA = "#196C4C";
const GRAFITO = "#24322B";
const LINEA = "#DEE3DA";

const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'Courier New', Courier, monospace";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type CobraEmail = {
  // Primera línea visible en la bandeja junto al asunto (se oculta en el cuerpo).
  preheader: string;
  // Etiqueta mono uppercase bajo el wordmark ("Bienvenido a Cobra").
  eyebrow: string;
  heading: string;
  paragraphs?: string[];
  // Bloque HTML ya construido (tabla del resumen). Confiado: quien lo genera
  // escapa sus datos con escapeHtml.
  blockHtml?: string;
  cta?: { label: string; url: string };
  // "Si el botón no funciona, copia esta dirección": para verificación/reset.
  fallbackUrl?: string;
  // Por qué recibes esto (obligatorio: es la línea de confianza).
  footer: string;
};

export function renderCobraEmail(email: CobraEmail): string {
  const paragraphs = (email.paragraphs ?? [])
    .map(
      (p) =>
        `<p style="margin:0 0 14px; font-family:${SANS}; font-size:15px; line-height:1.6; color:${GRAFITO};">${escapeHtml(p)}</p>`,
    )
    .join("\n");

  const cta = email.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 6px;">
        <tr>
          <td bgcolor="${COBRA}" style="border-radius:8px;">
            <a href="${escapeHtml(email.cta.url)}" target="_blank"
               style="display:inline-block; padding:12px 26px; font-family:${SANS}; font-size:15px; font-weight:600; color:#FFFFFF; text-decoration:none; border-radius:8px;">
              ${escapeHtml(email.cta.label)}
            </a>
          </td>
        </tr>
      </table>`
    : "";

  const fallback = email.fallbackUrl
    ? `<p style="margin:16px 0 0; font-family:${SANS}; font-size:12px; line-height:1.6; color:${MUSGO}; word-break:break-all;">
        Si el botón no funciona, copia y pega esta dirección en tu navegador:<br>
        <a href="${escapeHtml(email.fallbackUrl)}" style="color:${COBRA}; text-decoration:underline;">${escapeHtml(email.fallbackUrl)}</a>
      </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="es" style="color-scheme: light;">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(email.heading)}</title>
</head>
<body style="margin:0; padding:0; background-color:${PAPEL};">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${escapeHtml(email.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAPEL}">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px; max-width:100%;">

          <!-- Cabecera: la banda de tinta del hero de la app -->
          <tr>
            <td bgcolor="${TINTA}" style="border-radius:14px 14px 0 0; padding:26px 32px 22px;">
              <div style="font-family:${SERIF}; font-size:26px; line-height:1; color:${MARFIL};">Cobra</div>
              <div style="margin-top:10px; font-family:${MONO}; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:${MUSGO};">${escapeHtml(email.eyebrow)}</div>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td bgcolor="#FFFFFF" style="border:1px solid ${LINEA}; border-top:none; border-radius:0 0 14px 14px; padding:30px 32px 28px;">
              <h1 style="margin:0 0 16px; font-family:${SERIF}; font-weight:normal; font-size:24px; line-height:1.3; color:${TINTA};">${escapeHtml(email.heading)}</h1>
              ${paragraphs}
              ${email.blockHtml ?? ""}
              ${cta}
              ${fallback}
            </td>
          </tr>

          <!-- Pie -->
          <tr>
            <td style="padding:18px 32px 0;">
              <p style="margin:0; font-family:${SANS}; font-size:12px; line-height:1.6; color:${MUSGO};">${escapeHtml(email.footer)}</p>
              <p style="margin:10px 0 0; font-family:${MONO}; font-size:11px; letter-spacing:1px; color:${MUSGO};">micobra.es — persigue tus facturas por ti</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

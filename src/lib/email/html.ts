// Plantilla HTML del recordatorio para marcas con branding activado (Estudio).
// Referencia de diseño: papel con membrete, no "email transaccional". Es una
// carta de cobro profesional que lleva la marca del REMITENTE (estudio/
// autónomo), no la de Cobra. Monocromo cálido de papelería (el color lo pone
// el logo); cuerpo en serif ("lo escribió una persona"); un bloque de
// referencia mecanografiado (Factura / Vencimiento / Importe) como firma del
// diseño, en vez de un cajón de color con botón. Sin CTA ni chrome de
// marketing. Todo con tablas + estilos inline: es email, no web. El envío
// adjunta SIEMPRE la versión de texto plano.

const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const PAPER = "#FBFAF7";
const SHEET = "#FFFFFF";
const INK = "#1C1B19";
const MUTED = "#6B6862";
const RULE = "#E7E4DD";

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function refCell(label: string, value: string, first: boolean): string {
  return `<td class="refcell" style="padding:12px ${first ? "16px 12px 0" : "16px 12px 16px"};vertical-align:top;font-family:${SANS};">
    <div style="font-size:10px;line-height:1;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};">${escapeHtml(label)}</div>
    <div style="margin-top:4px;font-size:14px;line-height:1.3;font-weight:600;color:${INK};">${escapeHtml(value)}</div>
  </td>`;
}

export function renderBrandedEmail(opts: {
  bodyText: string; // cuerpo ya interpolado ({{variables}} resueltas)
  brandName: string;
  logoUrl: string | null; // URL pública absoluta del logo, o null
  reference: { numero: string; vencimiento: string; importe: string };
}): string {
  const paragraphs = opts.bodyText
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;">${escapeHtml(p).replaceAll("\n", "<br />")}</p>`,
    )
    .join("");

  const letterhead = opts.logoUrl
    ? `<img src="${opts.logoUrl}" alt="${escapeHtml(opts.brandName)}" height="40" style="display:block;height:40px;max-height:40px;max-width:200px;border:0;outline:none;text-decoration:none;" />`
    : `<div style="font-family:${SERIF};font-size:20px;line-height:1.2;font-weight:600;letter-spacing:0.01em;color:${INK};">${escapeHtml(opts.brandName)}</div>`;

  // Texto de vista previa en la bandeja (oculto). Relleno con zero-width
  // spaces para que el cliente no arrastre cuerpo del correo a la preview.
  const preheader = `Recordatorio de la factura ${escapeHtml(opts.reference.numero)}`;
  const preheaderPad = "&#8203;&nbsp;".repeat(60);

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>Recordatorio de la factura ${escapeHtml(opts.reference.numero)}</title>
<style>
  @media (max-width:600px){
    .sheet{width:100%!important}
    .pad{padding-left:24px!important;padding-right:24px!important}
    .refcell{display:block!important;width:100%!important;padding:10px 0!important}
    .refcell:first-child{padding-top:14px!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${PAPER};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${PAPER};font-size:1px;line-height:1px;">${preheader}${preheaderPad}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};">
  <tr>
    <td align="center" style="padding:32px 12px;">
      <table role="presentation" class="sheet" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;background:${SHEET};border:1px solid ${RULE};border-radius:10px;">
        <tr>
          <td class="pad" style="padding:32px 40px 0;">${letterhead}</td>
        </tr>
        <tr>
          <td class="pad" style="padding:20px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${RULE};border-bottom:1px solid ${RULE};background:${PAPER};">
              <tr>
                ${refCell("Factura", opts.reference.numero, true)}
                ${refCell("Vencimiento", opts.reference.vencimiento, false)}
                ${refCell("Importe", opts.reference.importe, false)}
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td class="pad" style="padding:26px 40px 8px;font-family:${SERIF};font-size:16px;line-height:1.65;color:${INK};">${paragraphs}</td>
        </tr>
        <tr>
          <td class="pad" style="padding:14px 40px 32px;">
            <div style="border-top:1px solid ${RULE};padding-top:14px;font-family:${SANS};font-size:12px;line-height:1.4;letter-spacing:0.02em;color:${MUTED};">${escapeHtml(opts.brandName)}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

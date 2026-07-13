// Plantilla HTML de recordatorio para marcas con branding activado (Estudio).
// Sobria, "de carta": el texto del recordatorio manda; el logo (o el nombre de
// la marca) encabeza y un pie discreto cierra. Todo inline-style y tablas:
// es email, no web. El envío adjunta siempre la versión de texto plano.

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const FONT =
  "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function renderBrandedEmail(opts: {
  bodyText: string; // cuerpo ya interpolado ({{variables}} resueltas)
  brandName: string;
  logoUrl: string | null; // URL pública absoluta del logo, o null
}): string {
  const paragraphs = opts.bodyText
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;">${escapeHtml(p).replaceAll("\n", "<br />")}</p>`,
    )
    .join("");

  const header = opts.logoUrl
    ? `<img src="${opts.logoUrl}" alt="${escapeHtml(opts.brandName)}" height="40" style="display:block;height:40px;max-width:220px;object-fit:contain;" />`
    : `<span style="font-family:${FONT};font-size:18px;font-weight:600;color:#12241c;">${escapeHtml(opts.brandName)}</span>`;

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f4f5ef;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5ef;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:#ffffff;border-radius:12px;">
            <tr>
              <td style="padding:28px 32px 0;">${header}</td>
            </tr>
            <tr>
              <td style="padding:20px 32px 8px;font-family:${FONT};font-size:15px;line-height:1.6;color:#12241c;">${paragraphs}</td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;">
                <hr style="border:none;border-top:1px solid #e7e8e2;margin:8px 0 12px;" />
                <span style="font-family:${FONT};font-size:12px;color:#8a8f8b;">${escapeHtml(opts.brandName)}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

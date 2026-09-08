import { escapeHtml, renderCobraEmail } from "@/lib/email/cobra-template";
import { getTransport } from "@/lib/email/transport";
import { leerBorrador } from "./borradores";
import { generarPdfBurofax } from "./pdf";
import { formatearFecha } from "./plazos";
import { construirCarta } from "./texto";

const REMITENTE = "Cobra <soporte@micobra.es>";

// El correo que acompaña al burofax. Su trabajo NO es entregar el PDF: eso ya
// ha pasado, el usuario lo ha descargado hace diez segundos y si el correo solo
// repitiera el adjunto nadie tendría motivo para pulsar nada.
//
// Su trabajo es vender lo único que el PDF no puede dar: lo que va a pasar
// dentro de tres semanas. El plazo que vence, la ventana del IVA que se abre y
// se cierra, la prescripción que este burofax acaba de reiniciar. Eso son
// fechas que nadie se apunta y que, cuando se pasan, cuestan dinero de verdad.
export async function enviarCorreoBurofax(
  email: string,
  claimToken: string,
  urlMagica: string,
): Promise<void> {
  const borrador = await leerBorrador(claimToken);
  // El enlace mágico llega hasta aquí desde Better-Auth; si el borrador ya no
  // está, no hay carta que adjuntar y tampoco seguimiento que ofrecer.
  if (!borrador) return;

  // Se rehace con la fecha de generación, no con "ahora": el adjunto tiene que
  // ser byte a byte la misma carta que el usuario ya se ha descargado.
  const carta = construirCarta(borrador.payload, borrador.generadoEl);
  const pdf = await generarPdfBurofax(carta);
  const { factura } = borrador.payload;

  const hitos = [
    `${formatearFecha(carta.venceElPlazo)} — vence el plazo que le has dado para pagar.`,
    `${carta.iva.desde} — puedes empezar a recuperar el IVA de esta factura.`,
    `${carta.iva.hasta} — último día para hacerlo. Pasado, ese IVA no vuelve.`,
  ];

  const html = renderCobraEmail({
    preheader: `Tu burofax para la factura ${factura.numero}, y las tres fechas que vienen después.`,
    eyebrow: "Burofax generado",
    heading: "Ya tienes la carta. Ahora vienen las fechas.",
    paragraphs: [
      "Adjunto va el burofax en PDF, por si lo pierdes. Llévalo a cualquier oficina de Correos o envíalo desde correos.es pidiendo certificación de texto y acuse de recibo: sin esas dos cosas es una carta normal y no prueba nada.",
      "Lo que no cabe en el PDF son las fechas que empiezan a correr desde hoy:",
    ],
    blockHtml: `<ul style="margin:0 0 16px; padding-left:18px; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; font-size:14px; line-height:1.7; color:#24322B;">${hitos
      .map((h) => `<li>${escapeHtml(h)}</li>`)
      .join("")}</ul>`,
    cta: { label: "Que Cobra me avise", url: urlMagica },
    fallbackUrl: urlMagica,
    footer:
      "Recibes este correo porque acabas de generar un burofax en micobra.es. El enlace es válido durante 72 horas y solo sirve para esta dirección.",
  });

  await getTransport().send({
    to: email,
    from: REMITENTE,
    subject: `Tu burofax para la factura ${factura.numero}`,
    text: `Adjunto va tu burofax en PDF para la factura ${factura.numero}.

Llévalo a cualquier oficina de Correos o envíalo desde correos.es pidiendo certificación de texto y acuse de recibo: sin esas dos cosas es una carta normal y no prueba nada.

Lo que no cabe en el PDF son las fechas que empiezan a correr desde hoy:

${hitos.map((h) => `· ${h}`).join("\n")}

Si quieres que te avise cuando toque, entra aquí y te guardo esta factura en seguimiento:

${urlMagica}

El enlace es válido durante 72 horas y solo sirve para esta dirección.
`,
    html,
    attachments: [
      {
        filename: `burofax-factura-${factura.numero}.pdf`,
        content: pdf.toString("base64"),
      },
    ],
  });
}

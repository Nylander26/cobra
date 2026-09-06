import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";

// Reenvía a un buzón personal el correo que SES recibe en el dominio.
//
// SES no sabe reenviar por sí solo: su regla de recepción deja el mensaje
// crudo en S3 y avisa a esta función, que lo lee y lo vuelve a enviar.
//
// El detalle que hace o rompe esto es el `From`. Si se reenvía conservando el
// remitente original, el correo sale de una IP de AWS que no está en el SPF
// del dominio de quien escribió, y Gmail lo trata como suplantación: al spam
// o directamente descartado. Por eso el `From` pasa a ser una dirección
// verificada nuestra y el remitente real viaja en `Reply-To`, que es lo que
// usa el botón de responder.

const s3 = new S3Client({});
const ses = new SESv2Client({});

const BUCKET = process.env.MAIL_BUCKET;
const PREFIX = process.env.MAIL_PREFIX ?? "";
const FROM = process.env.FORWARD_FROM; // p. ej. soporte@micobra.es
const TO = process.env.FORWARD_TO; // tu buzón personal

// Cabeceras que dejan de ser ciertas en cuanto se toca el mensaje. La firma
// DKIM original cubre unas cabeceras que estamos reescribiendo, así que
// dejarla puesta garantiza un fallo de verificación: es peor que no firmar.
const CABECERAS_A_QUITAR = [
  "dkim-signature",
  "domainkey-signature",
  "authentication-results",
  "received-spf",
  "return-path",
  "sender",
  "from",
  "reply-to",
];

function partirMensaje(raw) {
  // Fin de cabeceras: primera línea en blanco. Se admiten CRLF y LF porque no
  // todos los emisores son consistentes.
  const corte = raw.search(/\r?\n\r?\n/);
  if (corte === -1) return { cabeceras: raw, cuerpo: "" };
  const finCabeceras = raw.slice(0, corte);
  const resto = raw.slice(corte).replace(/^\r?\n\r?\n/, "");
  return { cabeceras: finCabeceras, cuerpo: resto };
}

// Las cabeceras plegadas continúan en líneas que empiezan por espacio o tab;
// hay que arrastrarlas con la suya o se rompe el mensaje.
function plegarCabeceras(bloque) {
  const lineas = bloque.split(/\r?\n/);
  const cabeceras = [];
  for (const linea of lineas) {
    if (/^[ \t]/.test(linea) && cabeceras.length > 0) {
      cabeceras[cabeceras.length - 1] += `\r\n${linea}`;
    } else {
      cabeceras.push(linea);
    }
  }
  return cabeceras;
}

function nombre(fromOriginal) {
  // "Ana Pérez <ana@x.es>" → "Ana Pérez". Sin nombre, se usa la dirección.
  const conNombre = fromOriginal.match(/^\s*"?([^"<]*?)"?\s*<.+>\s*$/);
  const texto = (conNombre?.[1] ?? fromOriginal).trim();
  // Las comillas dentro del display name rompen la cabecera.
  return texto.replace(/["\\]/g, "");
}

export async function handler(event) {
  if (!BUCKET || !FROM || !TO) {
    throw new Error("Faltan MAIL_BUCKET, FORWARD_FROM o FORWARD_TO");
  }

  const registro = event.Records?.[0]?.ses;
  const messageId = registro?.mail?.messageId;
  if (!messageId) {
    console.error("Evento sin messageId de SES", JSON.stringify(event));
    return { ok: false };
  }

  const objeto = await s3.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: `${PREFIX}${messageId}` }),
  );
  const raw = await objeto.Body.transformToString();

  const { cabeceras, cuerpo } = partirMensaje(raw);
  const originales = plegarCabeceras(cabeceras);

  const fromOriginal =
    originales
      .find((h) => h.toLowerCase().startsWith("from:"))
      ?.slice(5)
      .trim() ?? "desconocido";

  const conservadas = originales.filter((h) => {
    const clave = h.slice(0, h.indexOf(":")).toLowerCase();
    return !CABECERAS_A_QUITAR.includes(clave);
  });

  const nuevas = [
    `From: "${nombre(fromOriginal)} (vía Cobra)" <${FROM}>`,
    `Reply-To: ${fromOriginal}`,
    `To: ${TO}`,
    // Deja rastro de quién escribió de verdad, por si el Reply-To se pierde
    // en algún cliente de correo.
    `X-Original-From: ${fromOriginal}`,
  ];

  // El To original ya se sustituye arriba; fuera el de la cabecera conservada.
  const sinTo = conservadas.filter(
    (h) => !h.toLowerCase().startsWith("to:") && h.trim() !== "",
  );

  const mensaje = `${[...nuevas, ...sinTo].join("\r\n")}\r\n\r\n${cuerpo}`;

  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: FROM,
      Destination: { ToAddresses: [TO] },
      Content: { Raw: { Data: Buffer.from(mensaje, "utf8") } },
    }),
  );

  console.log(`Reenviado ${messageId} de ${fromOriginal} a ${TO}`);
  return { ok: true };
}

"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { guardarBorrador } from "@/lib/burofax/borradores";
import { generarPdfBurofax } from "@/lib/burofax/pdf";
import { formatearFecha } from "@/lib/burofax/plazos";
import { parsearBurofax, type ErroresBurofax } from "@/lib/burofax/schema";
import { construirCarta } from "@/lib/burofax/texto";
import { registrarLead } from "@/lib/leads";
import { atribucionDeHeaders } from "@/lib/meta/attrib";
import { checkRateLimit } from "@/lib/rate-limit";

// Deliberadamente laxo, igual que en la calculadora: solo descarta lo que no
// puede ser un correo. Validar de más aquí pierde leads reales.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type BurofaxState = {
  ok?: boolean;
  error?: string;
  errores?: ErroresBurofax;
  // El PDF viaja en base64 hasta el navegador, que lo convierte en descarga.
  // No se sube a S3 ni se sirve por URL: es un documento con el NIF y el
  // domicilio de un tercero y no tiene por qué existir en ningún disco.
  pdf?: string;
  nombreArchivo?: string;
  resumen?: {
    total: string;
    numero: string;
    venceElPlazo: string;
    ivaDesde: string;
    ivaHasta: string;
    // Lo que se manda a Meta como valor de la conversión.
    reclamableCents: number;
  };
};

export async function generarBurofax(
  _prev: BurofaxState,
  formData: FormData,
): Promise<BurofaxState> {
  // Trampa para bots: campo oculto que ninguna persona ve. Se responde ok sin
  // hacer nada, para no enseñarle al bot qué le ha delatado.
  if (String(formData.get("empresa") ?? "").trim() !== "") return { ok: true };

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!EMAIL.test(email)) {
    return { errores: { email: "Revisa tu correo electrónico." } };
  }

  // Por IP, lo único que no controla quien escribe. Tres por hora: generar el
  // burofax cuesta un PDF y un correo con adjunto, y nadie necesita más de
  // tres cartas distintas en una hora.
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";
  if (!(await checkRateLimit(`burofax:${ip}`, { max: 3, windowSeconds: 3600 }))) {
    return {
      error:
        "Has generado varios burofax seguidos. Espera un rato y vuelve a intentarlo.",
    };
  }

  // El payload se revalida entero en el servidor: lo que llega del navegador
  // son datos de entrada, nunca un resultado ya bueno. Un burofax con el NIF
  // mal no vale para nada y el usuario no se entera hasta que es tarde.
  const ahora = new Date();
  const parseado = parsearBurofax(formData, ahora);
  if (!parseado.ok) {
    return {
      errores: parseado.errores,
      error: "Revisa los campos marcados: un dato mal deja la carta sin valor.",
    };
  }

  const { payload } = parseado;
  const carta = construirCarta(payload, ahora);
  const reclamableCents = payload.factura.importeCents + carta.interes.totalCents;

  const pdf = await generarPdfBurofax(carta);

  // Cupo por dirección de destino, aparte del de IP. El correo lo teclea quien
  // rellena el formulario y nadie ha probado que sea suyo, así que sin este
  // límite Cobra sirve para mandarle burofaxes a un tercero desde nuestro
  // propio dominio: rotando IP el límite de arriba no lo impide, y la
  // entregabilidad del dominio es el producto. Se consume aquí, con el PDF ya
  // hecho, para que un error de validación no le gaste el cupo a nadie.
  const claveEmail = createHash("sha256").update(email).digest("hex");
  const puedeEnviar = await checkRateLimit(`burofax:email:${claveEmail}`, {
    max: 2,
    windowSeconds: 86_400,
  });

  // Agotado el cupo, el PDF baja igual —es a lo que ha venido— pero no se
  // guarda el borrador con los datos del deudor, no se registra el lead y no
  // sale ningún correo: nada que dependa de una dirección sin verificar.
  if (puedeEnviar) {
    await registrarLead({
      email,
      source: "burofax",
      amountCents: payload.factura.importeCents,
      claimableCents: carta.interes.totalCents,
      dueDate: payload.factura.venceEl,
      campana: atribucionDeHeaders(h).campana,
    });

    const { claimToken } = await guardarBorrador(email, payload, ahora);

    // El correo sale por dentro del enlace mágico: Better-Auth genera el token
    // de sesión y se lo pasa a `sendMagicLink`, que compone el correo del
    // burofax con el PDF adjunto. Si falla, el usuario ya tiene su PDF y eso es
    // lo que ha venido a buscar: la conversión a cuenta no puede llevarse por
    // delante el resultado.
    try {
      await auth.api.signInMagicLink({
        body: {
          email,
          name: payload.acreedor.nombre,
          callbackURL: `/onboarding/burofax?t=${claimToken}`,
          metadata: { flujo: "burofax", claimToken },
        },
        headers: h,
      });
    } catch (err) {
      console.error("[burofax] no se pudo enviar el correo de seguimiento:", err);
    }
  }

  return {
    ok: true,
    pdf: pdf.toString("base64"),
    nombreArchivo: `burofax-factura-${payload.factura.numero.replace(/[^\w.-]+/g, "-")}.pdf`,
    resumen: {
      total: carta.desglose.total,
      numero: payload.factura.numero,
      venceElPlazo: formatearFecha(carta.venceElPlazo),
      ivaDesde: carta.iva.desde,
      ivaHasta: carta.iva.hasta,
      reclamableCents,
    },
  };
}

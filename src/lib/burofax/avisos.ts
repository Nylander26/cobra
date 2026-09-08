import { and, eq, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { clients, invoices, ownerAlerts, user as userTable } from "@/db/schema";
import { renderCobraEmail } from "@/lib/email/cobra-template";
import { getTransport } from "@/lib/email/transport";
import { newId } from "@/lib/ids";
import { formatCents } from "@/lib/money";
import type { BurofaxPayload } from "./schema";
import {
  AVISO_PRESCRIPCION_MESES_ANTES,
  MONITORIO_DIAS_TRAS_PLAZO,
  PRESCRIPCION_ANIOS,
  aperturaRecuperacionIva,
  formatearFecha,
  limiteRecuperacionIva,
  sumarDias,
  sumarMeses,
  sumarAnios,
} from "./plazos";

// Avisos que Cobra manda AL USUARIO sobre los plazos de su propia deuda.
//
// Nunca al deudor. Acaba de recibir una carta certificada; mandarle además un
// correo automático "en nombre de" su acreedor, con un texto que el acreedor no
// ha visto y desde un dominio que probablemente aún no ha verificado, es la
// forma más rápida de convertir una reclamación seria en spam. Los envíos al
// deudor son otra tabla, otro remitente y otra decisión, que el usuario toma
// desde el panel cuando quiera.
//
// El remitente es siempre soporte@micobra.es: estos correos son de Cobra a su
// usuario, no del usuario a nadie.

const REMITENTE = "Cobra <soporte@micobra.es>";

// Con cuánta antelación avisar de que se cierra la ventana del IVA. Un mes: da
// tiempo a emitir la rectificativa y a presentarla sin prisas.
const DIAS_ANTES_CIERRE_IVA = 30;

export type Hito = {
  kind: "burofax_plazo" | "iva_apertura" | "iva_cierre" | "monitorio" | "prescripcion";
  scheduledAt: Date;
};

// Las fechas que se derivan de un burofax recién enviado. Se calculan una vez,
// al reclamar el borrador, y se materializan como filas: el cron solo consulta
// "scheduled_at <= now AND sent_at IS NULL", igual que los recordatorios.
export function hitosDelBurofax(
  payload: BurofaxPayload,
  enviadoEl: Date,
): Hito[] {
  const venceElPlazo = sumarDias(enviadoEl, payload.plazoDias);
  const cierreIva = limiteRecuperacionIva(payload.factura.emitidaEl);

  return [
    { kind: "burofax_plazo", scheduledAt: venceElPlazo },
    {
      kind: "monitorio",
      scheduledAt: sumarDias(venceElPlazo, MONITORIO_DIAS_TRAS_PLAZO),
    },
    {
      kind: "iva_apertura",
      scheduledAt: aperturaRecuperacionIva(payload.factura.emitidaEl),
    },
    {
      kind: "iva_cierre",
      scheduledAt: sumarDias(cierreIva, -DIAS_ANTES_CIERRE_IVA),
    },
    {
      kind: "prescripcion",
      scheduledAt: sumarMeses(
        sumarAnios(enviadoEl, PRESCRIPCION_ANIOS),
        -AVISO_PRESCRIPCION_MESES_ANTES,
      ),
    },
  ];
}

export async function materializarAvisos(
  userId: string,
  invoiceId: string,
  payload: BurofaxPayload,
  enviadoEl: Date,
  ahora: Date,
): Promise<number> {
  // Un hito ya pasado no se dispara retroactivamente: quien genera el burofax
  // de una factura de hace un año no debe recibir de golpe el aviso del IVA.
  const filas = hitosDelBurofax(payload, enviadoEl)
    .filter((hito) => hito.scheduledAt.getTime() > ahora.getTime())
    .map((hito) => ({
      id: newId("alr"),
      userId,
      invoiceId,
      kind: hito.kind,
      scheduledAt: hito.scheduledAt,
    }));

  if (filas.length > 0) await db.insert(ownerAlerts).values(filas);
  return filas.length;
}

type Contexto = {
  numero: string;
  deudor: string;
  importe: string;
  emitidaEl: Date;
  panelUrl: string;
  generadorUrl: string;
};

// El texto de cada aviso. Cada uno tiene que responder a "¿y qué hago yo con
// esto?" en la primera línea: un correo que solo dice "ha vencido un plazo" es
// ruido, y el segundo que llegue se archiva sin abrir.
function redactar(kind: Hito["kind"], c: Contexto) {
  switch (kind) {
    case "burofax_plazo":
      return {
        asunto: `Hoy vence el plazo que le diste a ${c.deudor}`,
        eyebrow: "Vence el plazo",
        heading: "Se acabó el plazo del burofax",
        parrafos: [
          `El burofax que enviaste por la factura ${c.numero} (${c.importe}) daba un plazo que vence hoy.`,
          "Si ha pagado, márcala como cobrada en tu panel y dejamos de darte la lata. Si no, ya tienes la parte difícil hecha: el acuse de recibo de Correos prueba que reclamaste, y con eso puedes ir al proceso monitorio sin abogado si la deuda no llega a 2.000 €.",
        ],
        cta: "Ver la factura",
      };
    case "monitorio":
      return {
        asunto: `Un mes desde el burofax a ${c.deudor}: toca decidir`,
        eyebrow: "Siguiente paso",
        heading: "Ha pasado un mes y sigue sin pagar",
        parrafos: [
          `La factura ${c.numero} (${c.importe}) sigue abierta un mes después de vencer el plazo del burofax.`,
          "A partir de aquí solo hay dos caminos honestos: el proceso monitorio, que se inicia con un formulario del Consejo General del Poder Judicial y no exige abogado ni procurador por debajo de 2.000 €, o dar la deuda por perdida y recuperar al menos el IVA. Lo que no compensa es seguir mandando correos.",
        ],
        cta: "Ver la factura",
      };
    case "iva_apertura":
      return {
        asunto: `Ya puedes recuperar el IVA de la factura ${c.numero}`,
        eyebrow: "Recuperación del IVA",
        heading: "Se abre la ventana para recuperar tu IVA",
        parrafos: [
          `Han pasado seis meses desde que emitiste la factura ${c.numero} sin cobrarla, así que a efectos del artículo 80.Cuatro de la Ley del IVA ya es un crédito incobrable.`,
          "Eso significa que puedes emitir una factura rectificativa y recuperar el IVA que adelantaste a Hacienda por un dinero que nunca has visto. El burofax que enviaste es justamente la prueba de reclamación que se exige para hacerlo.",
          "Habla con tu gestoría y enséñale el acuse de recibo. La ventana no dura para siempre: te avisamos otra vez antes de que se cierre.",
        ],
        cta: "Ver la factura",
      };
    case "iva_cierre":
      return {
        asunto: `Último mes para recuperar el IVA de la factura ${c.numero}`,
        eyebrow: "Se cierra la ventana",
        heading: "Queda un mes para rectificar esta factura",
        parrafos: [
          `El plazo para modificar la base imponible de la factura ${c.numero} y recuperar su IVA se cierra el ${formatearFecha(limiteRecuperacionIva(c.emitidaEl))}.`,
          "Pasada esa fecha, ese dinero ya no vuelve. Si aún no lo has hecho, esta semana es un buen momento para escribir a tu gestoría.",
        ],
        cta: "Ver la factura",
      };
    case "prescripcion":
      return {
        asunto: `La deuda de ${c.deudor} está a punto de prescribir`,
        eyebrow: "Prescripción",
        heading: "Quedan tres meses para volver a reclamar",
        parrafos: [
          `El burofax que enviaste por la factura ${c.numero} interrumpió la prescripción y reinició el plazo de cinco años. Ese plazo está a punto de agotarse.`,
          "Si la deuda sigue viva y quieres conservar el derecho a reclamarla, hay que volver a reclamar de forma fehaciente antes de que venza. Otro burofax basta, y vuelve a poner el contador a cero.",
        ],
        cta: "Generar otro burofax",
        ctaUrl: c.generadorUrl,
      };
  }
}

// Espejo de sendDueReminders, pero contra `owner_alerts` y hacia el usuario.
// Devuelve cuántos ha enviado; los fallos se registran y no cortan el lote.
export async function sendDueOwnerAlerts(ahora: Date): Promise<{
  enviados: number;
  fallidos: number;
}> {
  const pendientes = await db
    .select({
      alerta: ownerAlerts,
      factura: invoices,
      cliente: clients,
      usuario: userTable,
    })
    .from(ownerAlerts)
    .innerJoin(invoices, eq(ownerAlerts.invoiceId, invoices.id))
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .innerJoin(userTable, eq(ownerAlerts.userId, userTable.id))
    .where(
      and(isNull(ownerAlerts.sentAt), lte(ownerAlerts.scheduledAt, ahora)),
    )
    .limit(200);

  const appUrl = process.env.BETTER_AUTH_URL ?? "https://micobra.es";
  let enviados = 0;
  let fallidos = 0;

  for (const { alerta, factura, cliente, usuario } of pendientes) {
    // Una factura ya cobrada no necesita que le recuerden nada: se marca como
    // enviada para que no vuelva a salir en la consulta.
    if (factura.status === "paid" || factura.paidAt) {
      await db
        .update(ownerAlerts)
        .set({ sentAt: ahora })
        .where(eq(ownerAlerts.id, alerta.id));
      continue;
    }

    const panelUrl = `${appUrl}/dashboard/invoices`;
    const generadorUrl = `${appUrl}/modelo-burofax-reclamacion-factura-impagada`;
    const texto = redactar(alerta.kind, {
      numero: factura.number,
      deudor: cliente.company,
      importe: formatCents(factura.amountCents),
      emitidaEl: factura.issuedAt,
      panelUrl,
      generadorUrl,
    });
    // Cada aviso apunta a donde de verdad se resuelve: casi siempre la factura
    // en el panel, salvo el de prescripción, que pide otro burofax.
    const destino = ("ctaUrl" in texto ? texto.ctaUrl : null) ?? panelUrl;

    try {
      await getTransport().send({
        to: usuario.email,
        from: REMITENTE,
        subject: texto.asunto,
        text: `${texto.parrafos.join("\n\n")}\n\n${destino}\n`,
        html: renderCobraEmail({
          preheader: texto.asunto,
          eyebrow: texto.eyebrow,
          heading: texto.heading,
          paragraphs: texto.parrafos,
          cta: { label: texto.cta, url: destino },
          footer:
            "Recibes este aviso porque generaste un burofax para esta factura y pediste seguimiento. Puedes desactivarlo desde el panel.",
        }),
      });
      await db
        .update(ownerAlerts)
        .set({ sentAt: ahora })
        .where(eq(ownerAlerts.id, alerta.id));
      enviados += 1;
    } catch (err) {
      // Sin marcar como enviado: lo reintenta el cron de mañana.
      console.error(`[avisos] fallo enviando ${alerta.id}:`, err);
      fallidos += 1;
    }
  }

  return { enviados, fallidos };
}

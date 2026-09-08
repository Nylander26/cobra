"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { clients, events, invoices } from "@/db/schema";
import { materializarAvisos } from "@/lib/burofax/avisos";
import { leerBorrador, marcarReclamado } from "@/lib/burofax/borradores";
import { newId } from "@/lib/ids";
import { requireSession } from "@/lib/session";

export type ImportarState = { error?: string };

// Convierte el borrador del burofax en lo que Cobra ya sabe manejar: un cliente
// y una factura vencida, con sus hitos legales programados.
//
// Lo que NO hace: materializar `reminders`. La cadena de recordatorios escribe
// al deudor en nombre del usuario y desde su dominio, y aquí el deudor acaba de
// recibir una carta certificada con un texto que el usuario sí ha revisado —
// mientras que los recordatorios no los ha visto—. Esa cadena se activa desde
// el panel, cuando el usuario verifique su dominio y decida el tono. Aquí solo
// se programan avisos hacia él.
export async function importarBurofax(
  _prev: ImportarState,
  formData: FormData,
): Promise<ImportarState> {
  const session = await requireSession();
  const claimToken = String(formData.get("t") ?? "");

  const borrador = await leerBorrador(claimToken);
  if (!borrador) {
    return {
      error:
        "Ese enlace ya se ha usado o ha caducado. Vuelve a generar el burofax y te guardamos la factura.",
    };
  }

  // El token es la capacidad, pero se exige además que la sesión sea del correo
  // que generó la carta: sin esto, un enlace reenviado metería el NIF y el
  // domicilio de un deudor ajeno en la cuenta de quien lo abriera.
  if (borrador.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return {
      error:
        "Este burofax se generó con otra dirección de correo. Entra con esa cuenta para guardarlo.",
    };
  }

  const ahora = new Date();
  const { payload } = borrador;
  const clientId = newId("cli");
  const invoiceId = newId("inv");

  await db.insert(clients).values({
    id: clientId,
    userId: session.user.id,
    company: payload.deudor.nombre,
    // Todavía no se conoce: el burofax va por Correos, no por correo
    // electrónico. Se pide cuando el usuario active los envíos al deudor.
    billingEmail: "",
  });

  await db.insert(invoices).values({
    id: invoiceId,
    userId: session.user.id,
    clientId,
    number: payload.factura.numero,
    amountCents: payload.factura.importeCents,
    currency: "EUR",
    issuedAt: payload.factura.emitidaEl,
    dueAt: payload.factura.venceEl,
    status: "overdue",
    sequenceId: null,
  });

  const avisos = await materializarAvisos(
    session.user.id,
    invoiceId,
    payload,
    borrador.generadoEl,
    ahora,
  );

  await db.insert(events).values({
    id: newId("evt"),
    userId: session.user.id,
    type: "invoice_created",
    invoiceId,
    payload: { origen: "burofax", avisosProgramados: avisos },
  });

  // El payload cifrado se borra en el mismo acto: los datos del deudor ya viven
  // dentro de la cuenta como cliente y factura, y esta copia solo es exposición.
  await marcarReclamado(borrador.id);

  redirect("/dashboard/invoices");
}

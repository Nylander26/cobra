import { and, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { burofaxDrafts } from "@/db/schema";
import { newId } from "@/lib/ids";
import { cifrar, descifrar } from "./crypto";
import {
  aPlano,
  deTexto,
  type BurofaxPayload,
  type BurofaxPayloadPlano,
} from "./schema";

// Setenta y dos horas: lo que tarda alguien en volver del móvil al portátil, o
// en abrir el correo el lunes por la mañana. Pasado ese plazo el borrador se
// borra, porque guardar el NIF y el domicilio de un tercero indefinidamente
// "por si acaso" no tiene ninguna justificación.
export const HORAS_VIGENCIA_BORRADOR = 72;

export type Borrador = {
  id: string;
  email: string;
  payload: BurofaxPayload;
  // El instante en que se generó la carta. Rehacerla con esta fecha —y no con
  // "ahora"— reproduce exactamente el PDF que el usuario ya tiene: mismos días
  // de mora, mismos intereses, mismo plazo. Un PDF adjunto que no cuadra con
  // el descargado es un problema en un documento que va a un juzgado.
  generadoEl: Date;
};

export async function guardarBorrador(
  email: string,
  payload: BurofaxPayload,
  ahora: Date,
): Promise<{ id: string; claimToken: string }> {
  const { cifrado, iv } = cifrar(aPlano(payload));
  const id = newId("bfx");
  const claimToken = newId("claim");

  await db.insert(burofaxDrafts).values({
    id,
    email,
    payload: cifrado,
    iv,
    claimToken,
    expiresAt: new Date(
      ahora.getTime() + HORAS_VIGENCIA_BORRADOR * 60 * 60 * 1000,
    ),
    createdAt: ahora,
  });

  return { id, claimToken };
}

// Devuelve null si no existe, si ya se reclamó o si caducó. Los tres casos son
// el mismo para quien llega con un enlace viejo, y se le responde lo mismo.
export async function leerBorrador(
  claimToken: string,
): Promise<Borrador | null> {
  const [fila] = await db
    .select()
    .from(burofaxDrafts)
    .where(eq(burofaxDrafts.claimToken, claimToken))
    .limit(1);

  if (!fila || fila.claimedAt || fila.expiresAt <= new Date()) return null;

  return {
    id: fila.id,
    email: fila.email,
    payload: deTexto(descifrar<BurofaxPayloadPlano>(fila.payload, fila.iv)),
    generadoEl: fila.createdAt,
  };
}

// Reclamar borra el payload en el mismo acto: una vez los datos del deudor
// están dentro de la cuenta como cliente y factura, esta copia solo es
// exposición sin ninguna utilidad.
export async function marcarReclamado(id: string): Promise<void> {
  await db
    .update(burofaxDrafts)
    .set({ claimedAt: new Date(), payload: "", iv: "" })
    .where(eq(burofaxDrafts.id, id));
}

// La purga corre en el cron diario. Borra las filas caducadas y las reclamadas
// hace tiempo, que ya no tienen payload pero sí un correo asociado.
export async function purgarBorradores(ahora: Date): Promise<number> {
  const haceUnaSemana = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
  const borradas = await db
    .delete(burofaxDrafts)
    .where(
      or(
        and(lt(burofaxDrafts.expiresAt, ahora), isNull(burofaxDrafts.claimedAt)),
        lt(burofaxDrafts.createdAt, haceUnaSemana),
      ),
    )
    .returning({ id: burofaxDrafts.id });
  return borradas.length;
}

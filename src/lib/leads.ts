import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { newId } from "@/lib/ids";
import type { Campana } from "@/lib/meta/campana";

// Un lead es alguien que ha enseñado un impago concreto y ha dejado su correo
// sin abrir cuenta. Es el escalón que faltaba entre la visita fría del anuncio
// y el alta: el registro pide demasiado a quien acaba de llegar de Instagram.

export type NuevoLead = {
  email: string;
  source: string;
  amountCents?: number | null;
  claimableCents?: number | null;
  dueDate?: Date | null;
  campana?: Campana | null;
};

// Idempotente por correo: volver a calcular actualiza la fila con el último
// importe en vez de duplicar el contacto.
export async function registrarLead(datos: NuevoLead): Promise<void> {
  const ahora = new Date();
  await db
    .insert(leads)
    .values({
      id: newId("lead"),
      email: datos.email,
      source: datos.source,
      amountCents: datos.amountCents ?? null,
      claimableCents: datos.claimableCents ?? null,
      dueDate: datos.dueDate ?? null,
      campana: datos.campana ?? null,
      updatedAt: ahora,
    })
    .onConflictDoUpdate({
      target: leads.email,
      set: {
        source: datos.source,
        amountCents: datos.amountCents ?? null,
        claimableCents: datos.claimableCents ?? null,
        dueDate: datos.dueDate ?? null,
        // La campaña solo se pisa si esta visita trae una: quien vuelve por
        // búsqueda directa no debe borrar el anuncio que lo trajo la primera vez.
        ...(datos.campana ? { campana: datos.campana } : {}),
        updatedAt: ahora,
      },
    });
}

// Cierra el bucle: sin esto la tabla dice cuántos correos se capturan pero no
// cuántos acaban en cuenta, que es la única cifra que decide si la herramienta
// merece la inversión en anuncios. Nunca lanza: un alta no puede fallar porque
// falle la contabilidad de marketing.
export async function marcarLeadConvertido(
  email: string,
  userId: string,
): Promise<void> {
  try {
    await db
      .update(leads)
      .set({ userId, convertedAt: new Date() })
      .where(
        and(eq(leads.email, email.trim().toLowerCase()), isNull(leads.convertedAt)),
      );
  } catch (err) {
    console.error("[leads] no se pudo marcar la conversión:", err);
  }
}

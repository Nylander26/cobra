"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { brands, clients } from "@/db/schema";
import { newId } from "@/lib/ids";
import { requireSession } from "@/lib/session";

export type ClientFormState = { error?: string; ok?: boolean };

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createClient(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const { user } = await requireSession();

  const company = String(formData.get("company") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim();
  const billingEmail = String(formData.get("billingEmail") ?? "").trim();
  const brandId = String(formData.get("brandId") ?? "").trim();

  if (!company) return { error: "El nombre de la empresa es obligatorio." };
  if (!emailRe.test(billingEmail))
    return { error: "Introduce un email de facturación válido." };

  // El selector solo aparece con >1 marca; sin él, brand_id queda null y el
  // cliente resuelve a la marca por defecto del usuario.
  if (brandId) {
    const owned = await db
      .select({ id: brands.id })
      .from(brands)
      .where(and(eq(brands.id, brandId), eq(brands.userId, user.id)))
      .limit(1);
    if (owned.length === 0) return { error: "Marca no encontrada." };
  }

  await db.insert(clients).values({
    id: newId("cli"),
    userId: user.id,
    brandId: brandId || null,
    company,
    contactName: contactName || null,
    billingEmail,
  });

  revalidatePath("/dashboard/clients");
  return { ok: true };
}

export async function deleteClient(id: string): Promise<void> {
  const { user } = await requireSession();
  if (!id) return;

  // Scope by userId so one user can't delete another's client.
  await db
    .delete(clients)
    .where(and(eq(clients.id, id), eq(clients.userId, user.id)));

  revalidatePath("/dashboard/clients");
}

"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { clients } from "@/db/schema";
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

  if (!company) return { error: "El nombre de la empresa es obligatorio." };
  if (!emailRe.test(billingEmail))
    return { error: "Introduce un email de facturación válido." };

  await db.insert(clients).values({
    id: newId("cli"),
    userId: user.id,
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

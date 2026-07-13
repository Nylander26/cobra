"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { getUserBrands } from "@/lib/brands";
import { getUserPlan } from "@/lib/billing";
import { newId } from "@/lib/ids";
import { PLANS } from "@/lib/plans";
import { userHasFeature } from "@/lib/features";
import { requireSession } from "@/lib/session";

export type BrandFormState = { ok?: boolean; error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type BrandFields = {
  name: string;
  senderName: string | null;
  replyTo: string | null;
  signature: string | null;
};

function parseBrandFields(
  formData: FormData,
): { error: string } | { fields: BrandFields } {
  const name = String(formData.get("name") ?? "").trim();
  const senderName = String(formData.get("senderName") ?? "").trim();
  const replyTo = String(formData.get("replyTo") ?? "").trim();
  const signature = String(formData.get("signature") ?? "").trim();

  if (name.length < 1 || name.length > 120) {
    return { error: "El nombre debe tener entre 1 y 120 caracteres." };
  }
  if (senderName.length > 120) {
    return { error: "El nombre del remitente no puede superar 120 caracteres." };
  }
  if (replyTo && (replyTo.length > 200 || !EMAIL_RE.test(replyTo))) {
    return { error: "El email de respuesta no es válido." };
  }
  if (signature.length > 500) {
    return { error: "La firma no puede superar 500 caracteres." };
  }

  return {
    fields: {
      name,
      senderName: senderName || null,
      replyTo: replyTo || null,
      signature: signature || null,
    },
  };
}

export async function saveBrand(
  _prev: BrandFormState,
  formData: FormData,
): Promise<BrandFormState> {
  const { user } = await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Marca no encontrada." };

  const parsed = parseBrandFields(formData);
  if ("error" in parsed) return parsed;

  const updated = await db
    .update(brands)
    .set({ ...parsed.fields, updatedAt: new Date() })
    .where(and(eq(brands.id, id), eq(brands.userId, user.id)))
    .returning({ id: brands.id });
  if (updated.length === 0) return { error: "Marca no encontrada." };

  revalidatePath("/dashboard/marcas");
  return { ok: true };
}

export async function createBrand(
  _prev: BrandFormState,
  formData: FormData,
): Promise<BrandFormState> {
  const { user } = await requireSession();

  // Gate de servidor: la UI ya oculta el alta a planes sin multi-marca.
  if (!(await userHasFeature(user.id, "multi_brand"))) {
    return { error: "Las marcas adicionales están disponibles en el plan Estudio." };
  }

  const plan = await getUserPlan(user.id);
  const existing = await getUserBrands(user.id);
  if (existing.length >= PLANS[plan].brandLimit) {
    return {
      error: `Has alcanzado el límite de ${PLANS[plan].brandLimit} marcas de tu plan.`,
    };
  }

  const parsed = parseBrandFields(formData);
  if ("error" in parsed) return parsed;

  await db.insert(brands).values({
    id: newId("brd"),
    userId: user.id,
    isDefault: false,
    ...parsed.fields,
  });

  revalidatePath("/dashboard/marcas");
  return { ok: true };
}

export async function deleteBrand(id: string): Promise<void> {
  const { user } = await requireSession();
  if (!id) return;

  // La marca por defecto no se elimina. El FK de clients.brand_id es
  // set null: sus clientes pasan a resolver a la marca por defecto.
  await db
    .delete(brands)
    .where(
      and(
        eq(brands.id, id),
        eq(brands.userId, user.id),
        eq(brands.isDefault, false),
      ),
    );

  revalidatePath("/dashboard/marcas");
}

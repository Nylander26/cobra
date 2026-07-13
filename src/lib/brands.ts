import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { newId } from "@/lib/ids";

export type Brand = typeof brands.$inferSelect;

// La marca por defecto del usuario = su propia identidad como remitente. Se
// crea al primer uso con su nombre (mismo patrón que la secuencia por defecto;
// sin transacción en neon-http: una carrera podría duplicarla — raro y
// aceptable para MVP). Editable después en /dashboard/marcas.
export async function getOrCreateDefaultBrand(
  userId: string,
  userName: string,
): Promise<Brand> {
  const existing = await db
    .select()
    .from(brands)
    .where(and(eq(brands.userId, userId), eq(brands.isDefault, true)))
    .limit(1);
  if (existing.length > 0) return existing[0];

  const [created] = await db
    .insert(brands)
    .values({
      id: newId("brd"),
      userId,
      name: userName,
      isDefault: true,
    })
    .returning();
  return created;
}

// Todas las marcas del usuario, la por defecto primero. No crea la marca por
// defecto (para listados de solo lectura); quien la necesite garantizada usa
// getOrCreateDefaultBrand.
export async function getUserBrands(userId: string): Promise<Brand[]> {
  return db
    .select()
    .from(brands)
    .where(eq(brands.userId, userId))
    .orderBy(desc(brands.isDefault), asc(brands.createdAt));
}

// Marca efectiva de un cliente: la suya o, si no tiene (filas antiguas,
// planes de 1 marca), la por defecto del usuario.
export async function resolveBrand(
  userId: string,
  userName: string,
  brandId: string | null,
): Promise<Brand> {
  if (brandId) {
    const rows = await db
      .select()
      .from(brands)
      .where(and(eq(brands.id, brandId), eq(brands.userId, userId)))
      .limit(1);
    if (rows.length > 0) return rows[0];
  }
  return getOrCreateDefaultBrand(userId, userName);
}

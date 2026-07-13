import { sql } from "drizzle-orm";
import { db } from "@/db";
import { appRateLimits } from "@/db/schema";

// Limitador de ventana fija en Postgres para server actions. Un solo upsert
// atómico: si la ventana expiró se reinicia el contador, si no se incrementa.
// Devuelve false cuando la clave agotó su cupo en la ventana actual.
export async function checkRateLimit(
  key: string,
  opts: { max: number; windowSeconds: number },
): Promise<boolean> {
  const [row] = await db
    .insert(appRateLimits)
    .values({
      key,
      count: 1,
      resetAt: new Date(Date.now() + opts.windowSeconds * 1000),
    })
    .onConflictDoUpdate({
      target: appRateLimits.key,
      set: {
        count: sql`case when ${appRateLimits.resetAt} < now() then 1 else ${appRateLimits.count} + 1 end`,
        resetAt: sql`case when ${appRateLimits.resetAt} < now() then excluded.reset_at else ${appRateLimits.resetAt} end`,
      },
    })
    .returning({ count: appRateLimits.count });

  return row.count <= opts.max;
}

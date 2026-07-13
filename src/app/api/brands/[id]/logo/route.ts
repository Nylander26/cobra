import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";

// Sirve el logo de una marca para los correos HTML (los clientes de email no
// pueden autenticarse y Gmail elimina imágenes data:). Público a propósito:
// el logo ya viaja en cada recordatorio y el id de marca no es adivinable.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const rows = await db
    .select({ logoUrl: brands.logoUrl })
    .from(brands)
    .where(eq(brands.id, id))
    .limit(1);

  const dataUrl = rows[0]?.logoUrl;
  const match = dataUrl
    ? /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(dataUrl)
    : null;
  if (!match) return new Response("No encontrado", { status: 404 });

  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "content-type": match[1],
      "cache-control": "public, max-age=3600",
    },
  });
}

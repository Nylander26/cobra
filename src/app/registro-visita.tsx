import { headers } from "next/headers";
import { registrarUserAgent } from "@/lib/telemetria/user-agent";

// Leer cabeceras es un valor de request, así que este componente va aislado en
// su propio Suspense: el resto de la página se sigue prerenderizando. No pinta
// nada, y por eso el fallback es null.
export async function RegistroVisita({ punto }: { punto: string }) {
  registrarUserAgent(punto, await headers());
  return null;
}

import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { registrarUserAgent } from "@/lib/telemetria/user-agent";

const handler = toNextJsHandler(auth.handler);

export const { GET } = handler;

// Better-Auth sirve todo el árbol /api/auth/*: sesión, login, recuperación de
// contraseña. Aquí solo interesa el alta, que es la que se quiere leer contra
// la campaña; registrar el resto llenaría el log de ruido de sesiones.
export async function POST(request: Request) {
  if (new URL(request.url).pathname.endsWith("/sign-up/email")) {
    registrarUserAgent("signup", request.headers);
  }
  return handler.POST(request);
}

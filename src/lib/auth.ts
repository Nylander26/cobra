import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";

// En Vercel cada deployment tiene su propia URL además del dominio estable;
// Better-Auth por defecto solo confía en BETTER_AUTH_URL y respondía
// "Invalid origin" al registrarse desde esas URLs. Las variables VERCEL_*
// las inyecta la plataforma; en local quedan vacías y no añaden nada.
const vercelOrigins = [
  process.env.VERCEL_URL,
  process.env.VERCEL_BRANCH_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
]
  .filter((host): host is string => Boolean(host))
  .map((host) => `https://${host}`);

export const auth = betterAuth({
  trustedOrigins: vercelOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  // Storage en BD: en serverless, el contador en memoria es por instancia y
  // no frena fuerza bruta/registro masivo. Clave por defecto: IP + ruta.
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "rateLimit",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 3600, max: 5 },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      senderName: {
        type: "string",
        required: false,
      },
      emailSignature: {
        type: "string",
        required: false,
      },
    },
  },
});

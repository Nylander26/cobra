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

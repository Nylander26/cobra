import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { renderCobraEmail } from "@/lib/email/cobra-template";
import { getTransport } from "@/lib/email/transport";
import {
  atribucionDeHeaders,
  atribucionDeRequest,
  combinarAtribucion,
  guardarAtribucion,
  leerAtribucion,
} from "@/lib/meta/attrib";
import { enviarEventoMeta } from "@/lib/meta/capi";

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
      "/request-password-reset": { window: 3600, max: 5 },
    },
  },
  // Sin email verificado no se entra: Cobra envía correos con reply-to al
  // email del usuario, así que la dirección tiene que ser suya de verdad
  // (anti-abuso de envío y anti-typos). Al intentar entrar sin verificar,
  // Better-Auth reenvía el enlace automáticamente.
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    // Vía de recuperación: sin esto, quien olvida su contraseña (o nunca
    // recibió el correo de verificación) queda fuera para siempre.
    revokeSessionsOnPasswordReset: true,
    async sendResetPassword({ user, url }) {
      await getTransport().send({
        to: user.email,
        from: "Cobra <soporte@micobra.es>",
        subject: "Restablece tu contraseña de Cobra",
        text: `Hola ${user.name},

Alguien (esperamos que tú) ha pedido restablecer la contraseña de tu cuenta de Cobra. Usa este enlace para elegir una nueva:

${url}

El enlace caduca en 1 hora. Si no lo has pedido tú, ignora este mensaje: tu contraseña sigue igual.
`,
        html: renderCobraEmail({
          preheader: "Enlace para elegir una contraseña nueva. Caduca en 1 hora.",
          eyebrow: "Recuperación de acceso",
          heading: "Elige una contraseña nueva",
          paragraphs: [
            `Hola ${user.name}: alguien (esperamos que tú) ha pedido restablecer la contraseña de tu cuenta de Cobra.`,
            "El enlace caduca en 1 hora. Al usarlo, tu email queda confirmado y se cierran las sesiones abiertas.",
          ],
          cta: { label: "Restablecer contraseña", url },
          fallbackUrl: url,
          footer:
            "Si no lo has pedido tú, ignora este mensaje: tu contraseña sigue igual.",
        }),
      });
    },
    // Usar el enlace de reset demuestra acceso al buzón: vale también como
    // verificación del email (rescata cuentas anteriores a la verificación
    // obligatoria que nunca recibieron su correo de activación).
    async onPasswordReset({ user }) {
      await db
        .update(schema.user)
        .set({ emailVerified: true })
        .where(eq(schema.user.id, user.id));
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    // La cuenta queda activa aquí, no al crearse: hasta que no confirma el
    // email no entra, así que un alta sin verificar es un lead basura. Este es
    // el evento que conviene optimizar en Meta.
    //
    // Solo CAPI: el clic llega desde el cliente de correo y puede ser otro
    // dispositivo, así que no hay navegador nuestro donde disparar el píxel.
    // Por eso la atribución se combina —cookies de esta request si las hay, y
    // si no las guardadas cuando sí había navegador—.
    async afterEmailVerification(verificado, request) {
      const atribucion = combinarAtribucion(
        atribucionDeRequest(request),
        await leerAtribucion(verificado.id),
      );
      await enviarEventoMeta({
        eventName: "CompleteRegistration",
        // Determinista: un reintento no cuenta como un alta más.
        eventId: `reg_${verificado.id}`,
        actionSource: "system_generated",
        userData: {
          email: verificado.email,
          externalId: verificado.id,
          fbp: atribucion.fbp,
          fbc: atribucion.fbc,
          clientIp: atribucion.clientIp,
          clientUserAgent: atribucion.clientUserAgent,
        },
      });
    },
    async sendVerificationEmail({ user, url }) {
      await getTransport().send({
        to: user.email,
        from: "Cobra <soporte@micobra.es>",
        subject: "Confirma tu email para activar tu cuenta de Cobra",
        text: `Hola ${user.name},

Confirma que este es tu email para activar tu cuenta de Cobra:

${url}

Si no has creado esta cuenta, ignora este mensaje.
`,
        html: renderCobraEmail({
          preheader: "Un clic y tu cuenta queda activa.",
          eyebrow: "Bienvenido a Cobra",
          heading: `Hola ${user.name}: confirma tu email`,
          paragraphs: [
            "Confirma que esta dirección es tuya y tu cuenta queda activa. Es la dirección con la que tus clientes te responderán, así que tiene que ser de verdad.",
          ],
          cta: { label: "Confirmar y entrar", url },
          fallbackUrl: url,
          footer:
            "Recibes este correo porque se creó una cuenta en micobra.es con esta dirección. Si no has sido tú, ignóralo.",
        }),
      });
    },
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
  databaseHooks: {
    user: {
      create: {
        // El alta es el ÚLTIMO momento en que existen a la vez el usuario y el
        // navegador que lo trajo: `_fbp`, `_fbc` y la cookie de campaña viajan
        // en esta request y aquí ya hay un id al que atarlas.
        //
        // Sin esto la atribución de reserva nunca se escribía —`/api/meta/track`
        // solo la guarda si hay sesión, y en el alta todavía no la hay—, así que
        // quien confirmaba el email desde otro dispositivo generaba un
        // `CompleteRegistration` sin atribuir a ningún anuncio.
        async after(creado, context) {
          await guardarAtribucion(
            creado.id,
            atribucionDeHeaders(context?.headers ?? context?.request?.headers),
          );
        },
      },
    },
  },
});

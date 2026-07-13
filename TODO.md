# Cobra — Funcionalidades aplazadas (por prioridad)

Backlog de ideas y funcionalidades decididas pero pospuestas, para no perderlas.
Ordenado por prioridad. Al aplazar algo nuevo, añádelo aquí.

## Alta

- **Buzón entrante `soporte@micobra.es` → reenvío a wolfnylander@gmail.com.**
  Que un usuario (o cualquiera) pueda escribir directamente a `soporte@micobra.es`
  desde su correo y que llegue a la bandeja del owner. El formulario del panel
  (`/dashboard/soporte`) ya cubre el envío desde dentro de la app; esto es la
  parte de **recepción**, que no está montada.
  - Opción A (simple): reenviador tipo Cloudflare Email Routing o ImprovMX —
    solo cambiar el registro MX del dominio, reenvía gratis, sin código.
  - Opción B (AWS-native, preferida por el usuario si se queda en AWS): AWS SES
    Email Receiving en `eu-west-1`. SES recibe pero NO reenvía solo: MX → endpoint
    de entrada de SES → receipt rule guarda en S3 y/o dispara una Lambda que
    reenvía por SES al Gmail. La cuenta propia de SES debe verificar micobra.es
    para recepción (aparte de lo de Resend).

- **Tracking de aperturas y rebotes (webhook de Resend).**
  Registrar eventos de entrega/apertura/bounce/queja de los recordatorios para
  saber si el cliente los ve y detectar direcciones muertas.

## Media

- **Magic-link para marcar una factura como pagada desde el email resumen.**
  Enlace firmado en el correo para que el freelancer marque pagada sin entrar al panel.

- **Página pública SEO de la calculadora de intereses (Ley 3/2004).**
  Herramienta pública (captación por SEO) que calcule el interés de demora + los
  40 € del art. 8. De momento solo está in-app (decisión del usuario).

- **Dominio de envío propio por marca (plan Estudio).**
  Verificación de dominio propio para enviar desde el dominio del usuario.
  Decidido (2026-07-13): va por marca y es exclusivo de Estudio; no se anuncia
  en pricing hasta que exista. Hoy los recordatorios salen de
  `recordatorios@micobra.es`.

- **Marcas extra / tier gestoría.**
  Estudio incluye 3 marcas. Si una gestoría/asesoría necesita más, precio por
  marca adicional o un tier superior. Analizar cuando haya demanda real.

## Baja / infra

- **Redirección `www.micobra.es` → apex** (hoy ambos sirven; para SEO conviene 301).

- **Prueba real de checkout LIVE de Stripe** con tarjeta real (verificación del
  cobro end-to-end en producción; reembolsar tras probar).

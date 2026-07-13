# Cobra — Funcionalidades aplazadas (por prioridad)

Backlog de ideas y funcionalidades decididas pero pospuestas, para no perderlas.
Ordenado por prioridad. Al aplazar algo nuevo, añádelo aquí.

## Alta

- **Activar el tracking de aperturas/rebotes en producción.** El código ya está
  desplegado (2026-07-13: endpoint `/api/webhooks/resend` + columna "Correo" en
  facturas) pero es inerte hasta completar 3 pasos de configuración externa que
  requieren acción del usuario (o su autorización explícita al agente):
  1. Crear el webhook en Resend → endpoint `https://micobra.es/api/webhooks/resend`,
     eventos: `email.delivered`, `email.opened`, `email.bounced`, `email.complained`.
  2. Añadir el signing secret (`whsec_…`) del webhook como `RESEND_WEBHOOK_SECRET`
     en Vercel (Production) y redesplegar.
  3. (Para aperturas) activar *open tracking* en el dominio `micobra.es` de Resend
     — solo afecta a los correos HTML (marcas Estudio); el texto plano no lleva píxel.

## Media

- **Dominio de envío propio por marca (plan Estudio).**
  Verificación de dominio propio para enviar desde el dominio del usuario.
  Decidido (2026-07-13): va por marca y es exclusivo de Estudio; no se anuncia
  en pricing hasta que exista. Hoy los recordatorios salen de
  `recordatorios@micobra.es`. Aplazado también en la pasada del 13/07: requiere
  DNS del usuario final y no se puede verificar end-to-end sin un dominio real.

- **Marcas extra / tier gestoría.**
  Estudio incluye 3 marcas. Si una gestoría/asesoría necesita más, precio por
  marca adicional o un tier superior. Analizar cuando haya demanda real.

## Baja / infra

- **Buzón entrante `soporte@micobra.es` → reenvío a wolfnylander@gmail.com.**
  (Bajado de prioridad el 2026-07-13 a petición del usuario; requiere su
  configuración manual en DNS/AWS, fuera de la ejecución del agente.)
  Que cualquiera pueda escribir a `soporte@micobra.es` desde su correo y llegue
  al owner. El formulario del panel ya cubre el envío desde dentro de la app.
  - Opción A (simple): Cloudflare Email Routing o ImprovMX — solo registro MX.
  - Opción B (AWS-native): SES Email Receiving en `eu-west-1` + receipt rule →
    S3/Lambda que reenvía al Gmail. SES debe verificar micobra.es para recepción.

- **Prueba real de checkout LIVE de Stripe** con tarjeta real (la hace el
  usuario personalmente; reembolsar tras probar).

## Hecho (histórico reciente)

- ~~Tracking de aperturas y rebotes~~ → código completo 2026-07-13 (queda la
  activación de arriba).
- ~~Magic-link para marcar pagada~~ → 2026-07-13, incluye el resumen semanal
  (cron lunes 07:00 UTC) que era su portador.
- ~~Calculadora pública SEO de intereses (Ley 3/2004)~~ → 2026-07-13,
  `/calculadora-intereses-demora`.
- ~~Redirección www→apex~~ → 2026-07-13, 301 en next.config.
- ~~Recuperación de contraseña~~ → 2026-07-13, con verificación de email
  implícita al usar el enlace (rescata cuentas bloqueadas).

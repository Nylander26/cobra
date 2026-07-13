# Cobra — Funcionalidades aplazadas (por prioridad)

Backlog de ideas y funcionalidades decididas pero pospuestas, para no perderlas.
Ordenado por prioridad. Al aplazar algo nuevo, añádelo aquí.

## Alta

(vacío — el tracking quedó completo el 2026-07-13)

## Media

- **Completar el aviso legal con NIF y domicilio del titular** (obligatorios
  por LSSI art. 10) y **confirmar el tratamiento del IVA** de los precios con
  el gestor. Decisión del usuario (2026-07-13): esperar a que haya tráfico
  antes de publicar sus datos. Editar `src/app/legal/aviso-legal/page.tsx`.

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

## Hecho (histórico reciente)

- ~~Prueba real de checkout LIVE de Stripe~~ → 2026-07-13: el usuario hizo el
  checkout con tarjeta real, Estudio se activó bien vía webhook, y la
  suscripción se canceló en trial (0 € cobrados, sin reembolso necesario).
- ~~Open tracking~~ → 2026-07-13: subdominio `links.micobra.es` creado por el
  usuario en Resend (solo open tracking, click tracking OFF a propósito),
  CNAME → links1.resend-dns.com en Route53, dominio re-verificado. El tracking
  entero (entrega/apertura/rebote/queja) queda operativo.

- ~~Tracking de aperturas y rebotes~~ → código completo 2026-07-13 (queda la
  activación de arriba).
- ~~Magic-link para marcar pagada~~ → 2026-07-13, incluye el resumen semanal
  (cron lunes 07:00 UTC) que era su portador.
- ~~Calculadora pública SEO de intereses (Ley 3/2004)~~ → 2026-07-13,
  `/calculadora-intereses-demora`.
- ~~Redirección www→apex~~ → 2026-07-13, 301 en next.config.
- ~~Recuperación de contraseña~~ → 2026-07-13, con verificación de email
  implícita al usar el enlace (rescata cuentas bloqueadas).

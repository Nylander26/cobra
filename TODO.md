# Cobra — Funcionalidades aplazadas (por prioridad)

Backlog de ideas y funcionalidades decididas pero pospuestas, para no perderlas.
Ordenado por prioridad. Al aplazar algo nuevo, añádelo aquí.

## Alta

- **Dominio de envío propio por marca (plan Estudio).** _(subido de Media el
  2026-07-14 a petición del usuario; análisis hecho, implementación pendiente)_
  Enviar los recordatorios desde el dominio del propio usuario
  (`cobros@estudiowolf.com`) en vez de `recordatorios@micobra.es`. Es LA
  feature de Estudio: la entregabilidad y la identidad del remitente son el
  producto.
  - **Diseño técnico:**
    - Resend Domains API: `POST /domains` por marca → devuelve los registros
      DNS (DKIM CNAMEs, SPF/MX del return-path) que el usuario debe crear.
    - UI en `/dashboard/marcas`: tarjeta "Dominio de envío" con los registros
      a copiar, botón "Verificar" que consulta el estado (polling contra
      `GET /domains/{id}`), y estados pendiente/verificado/fallido.
    - Schema: columnas en `brands` — `fromDomain`, `fromLocalPart`
      (p. ej. `cobros`), `resendDomainId`, `domainStatus`.
    - Envío (`src/lib/reminders/send.ts`, `fromEmail()`): si la marca tiene
      dominio **verificado**, `from = nombre <local@dominio>`; si no,
      fallback silencioso al remitente actual de micobra.es. Nunca enviar
      desde un dominio sin verificar.
    - Gating: capability `own_domain` (ya reservada en el comentario de
      `src/lib/plans.ts`), solo Estudio, por marca.
    - Avisar en la UI de que si el dominio tiene DMARC estricto sin los
      registros creados, los correos irán a spam: la verificación es
      obligatoria, no opcional.
  - **Riesgos:** requiere acceso al DNS del usuario final (soporte guiado);
    no se puede verificar end-to-end sin un dominio real de prueba. No se
    anuncia en pricing hasta que exista.

## Media — ampliación de los planes (análisis 2026-07-14, decidido NO implementar aún)

Ideas para dar más carne a cada capa. Analizadas, sin compromiso: elegir
según demanda real. Los límites numéricos (facturas, marcas, tope diario)
ya escalan por plan; esto son capabilities nuevas.

### Estudio (justificar los 29 €; público: estudios y gestorías)

- **Personalización estética del correo HTML (paleta de colores).** _(añadido
  2026-07-14 al construir la vista previa de correos)_ La vista previa ya
  existe para Autónomo y Estudio (`/dashboard/secuencias`, capability
  `email_preview`); Estudio además podrá personalizar la estética del correo
  con marca.
  - **Diseño técnico:**
    - Paletas curadas (4–6: papel cálido actual, tinta fría, oscuro sobrio…)
      en vez de color picker libre: garantizan contraste y rendering
      consistente en clientes de correo. Opcional más adelante: acento
      derivado del logo.
    - Los tokens ya están concentrados en `src/lib/email/html.ts`
      (`PAPER`/`SHEET`/`INK`/`MUTED`/`RULE`): parametrizar
      `renderBrandedEmail()` con la paleta de la marca.
    - Schema: columna `emailTheme` en `brands` (id de paleta; default la
      actual).
    - UI: selector de paleta en la tarjeta de marca (`/dashboard/marcas`),
      con el modal de vista previa (`step-preview.tsx`) como lienzo para ver
      el cambio en vivo.
    - Gating: capability nueva `email_theming`, solo Estudio (la vista previa
      se queda en `email_preview` para Autónomo y Estudio).

- **Expediente de reclamación por factura.** Exportar un PDF con la línea
  temporal completa de una factura: recordatorios enviados (contenido, fecha),
  entregas/aperturas/rebotes del tracking, e intereses de demora calculados
  (la lógica ya existe en `/calculadora-intereses-demora`). Sirve como
  evidencia previa a un monitorio o reclamación (Ley 3/2004). Diferenciador
  fuerte en España y casi todo el dato ya está en la tabla `events`.
- **Multi-usuario / asientos.** Invitar colaboradores a la cuenta (una
  gestoría con varios empleados). Better-Auth trae plugin de organizaciones.
  Estudio: 3 asientos; más asientos → tier gestoría (abajo).
- **Informe mensual por marca.** Resumen enviable (PDF o email) por marca:
  cobrado, pendiente, aging (0-30/30-60/+60 días). Para que la gestoría se
  lo reenvíe a su cliente final. Reutiliza la maquinaria del resumen semanal.
- **Marcas extra / tier gestoría.** Estudio incluye 3 marcas. Si una
  gestoría necesita más: precio por marca adicional o tier superior con
  marcas+asientos ampliados. Analizar cuando haya demanda real (decidido
  2026-07-13).
- **API / claves de API.** Crear facturas y consultar estados desde el
  software de la gestoría. Solo si alguien lo pide; una exportación CSV
  (todas las capas) probablemente cubre el 80 % del caso.

### Autónomo (dar más carne a los 12 € frente a Free)

- **Facturas recurrentes (igualas/retainers).** Factura mensual auto-creada
  con su secuencia materializada. Caso muy común en autónomos (cuota
  mensual de mantenimiento, iguala de asesoría).
- **Enlace de pago en el recordatorio.** Campo por factura (o por marca) con
  el enlace de pago del usuario (Stripe Payment Link, Bizum, transferencia)
  y variable `{{enlace_pago}}` en las plantillas. "Cobra más rápido" es la
  promesa del producto; darle al moroso un botón de pagar la cumple.
- **Variable `{{intereses}}` en el aviso final.** Calcular los intereses de
  demora devengados (lógica de la calculadora) y ofrecerlos como variable
  en secuencias personalizadas. Endurece el último aviso con cifra real.
- **Adjuntar el PDF de la factura al recordatorio.** Los PDF ya viven en S3.
  Toggle por factura (los adjuntos penalizan algo la entregabilidad; que sea
  opt-in). Resend soporta attachments.
- **Estadísticas de cobro.** Sección en el dashboard: tiempo medio de cobro,
  % pagadas a tiempo, evolución mensual. Todo sale de `invoices` + `events`.

### Transversal / pricing

- **Plan anual con descuento (2 meses gratis).** No es una capability, es
  monetización: baja churn y adelanta caja. Stripe lo soporta con un price
  anual por plan. Quick win cuando haya tracción.
- **Importación CSV de clientes y facturas.** Mata la fricción del alta.
  Candidata a estar en TODAS las capas (es adopción, no premium), con los
  límites de cada plan aplicando al importar.

## Media (resto)

- **Completar el aviso legal con NIF y domicilio del titular** (obligatorios
  por LSSI art. 10) y **confirmar el tratamiento del IVA** de los precios con
  el gestor. Decisión del usuario (2026-07-13): esperar a que haya tráfico
  antes de publicar sus datos. Editar `src/app/legal/aviso-legal/page.tsx`.

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

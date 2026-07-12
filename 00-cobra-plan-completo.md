# Cobra — Recordatorios de Cobro Automáticos para Freelancers Españoles

> Estado actual: spec definida (schema de BD, API surface, stack decidido). **Nada construido.** Este documento es el plan de ejecución de cero a lanzamiento.

## 1. El problema

Los freelancers españoles pierden dinero y tiempo persiguiendo facturas impagadas. El seguimiento manual es incómodo (nadie quiere escribir "el tercer email recordando el pago"), inconsistente, y muchas veces simplemente no ocurre: la factura vencida se queda en el limbo por vergüenza o por olvido. En España el problema se agrava por la cultura de pago tardío B2B.

**Cliente objetivo:** freelancer o micro-agencia española que emite 3–20 facturas/mes a clientes empresa. Ya factura con algo (Excel, Word, Holded, o su gestoría) — el dolor no es EMITIR la factura, es COBRARLA.

## 2. Propuesta de valor

"Cobra persigue tus facturas por ti: recordatorios automáticos, educados y en tu nombre, hasta que te pagan. Tú no vuelves a escribir un email incómodo."

### Posicionamiento clave
No compitas como "software de facturación" (Holded, Quipu, Billin — mercado saturado). Posiciónate como **capa de cobro**: funciona con las facturas que ya tienes, vengan de donde vengan. Esto reduce el MVP y evita la guerra frontal.

### Alcance del MVP (qué SÍ)
- Registro de facturas: manual rápido (cliente, importe, nº, fecha emisión, vencimiento) + subida del PDF existente
- Secuencias de recordatorio configurables: p. ej. 3 días antes del vencimiento (amable), el día D (neutro), +7 (firme), +15 (última + mención a intereses de demora)
- Plantillas en español profesional, editables, enviadas **desde el email del freelancer** (dominio verificado en Resend o "en nombre de") — crítico: el cliente moroso debe ver al freelancer, no a una app
- Escalado de tono automático por plantilla según días de retraso
- Detección de pago: el freelancer marca "pagada" con un clic desde el email de resumen (v1 manual; conciliación bancaria es v2)
- Dashboard: pendiente de cobro total, facturas por estado, aging (0–30, 30–60, +60 días)
- Cálculo automático de intereses de demora según la Ley 3/2004 de morosidad (tipo BCE + 8 puntos) — nadie más hace esto y es un gancho de contenido brutal
- Email semanal de resumen al freelancer ("esta semana Cobra ha enviado 4 recordatorios, se han pagado 2 facturas")

### Qué NO (v1)
- Emisión de facturas / Verifactu / facturación electrónica (te mete en regulación profunda; integra, no compitas)
- Conciliación bancaria automática (PSD2/GoCardless — v2)
- Cobro embebido (link de pago Stripe en el recordatorio — v1.5, gran upsell)
- Multi-idioma
- Portal del deudor

## 3. Stack (el ya decidido en tu spec)

- **Next.js 16** (App Router) + **Drizzle ORM** + **Neon Postgres**
- **Better-Auth** para auth
- **Resend** con dominios verificados por usuario para enviar en su nombre (SPF/DKIM — dedica tiempo a que la entregabilidad sea impecable: ES el producto)
- **Vercel Cron** para el motor de secuencias (job cada hora: qué recordatorios tocan hoy)
- **Stripe** para tu suscripción
- **Vercel Blob/R2** para los PDFs de facturas

## 4. Modelo de datos (contrasta con tu spec existente)

```
users            → freelancers (+ datos de remitente: nombre, firma, dominio verificado)
clients          → clientes del freelancer (empresa, contacto, email de facturación)
invoices         → nº, importe, moneda, emitida_el, vence_el, estado (draft/sent/overdue/paid/written_off), pdf_url
sequences        → plantillas de secuencia (pasos con offset de días y plantilla de email)
sequence_steps   → offset (-3, 0, +7, +15), asunto, cuerpo, tono
reminders        → instancias programadas/enviadas por factura (scheduled_at, sent_at, opened_at)
email_domains    → dominios verificados por usuario (estado DNS)
events           → auditoría: recordatorio enviado, abierto, factura marcada pagada
```

Detalle importante: `reminders` se materializa al crear la factura (no se calcula al vuelo) → el cron solo consulta "reminders con scheduled_at <= now y sent_at null". Simple, idempotente, depurable.

## 5. Plan de construcción (3 semanas desde cero)

**Semana 1 — Fundación + core de datos**
- Días 1–2: scaffold Next.js 16 + Drizzle + Neon + Better-Auth + estructura de proyecto. Este scaffold es tu boilerplate para todos los micro-SaaS futuros: hazlo limpio y extraíble
- Días 3–4: CRUD de clientes y facturas + subida de PDF + estados
- Día 5: secuencias y plantillas (con 1 secuencia por defecto muy bien escrita — el copy de las plantillas es producto, no relleno)

**Semana 2 — El motor (el producto de verdad)**
- Días 1–2: materialización de reminders + cron horario + envío vía Resend
- Día 3: verificación de dominio del usuario (flujo DNS con instrucciones claras) + fallback "enviado en nombre de"
- Día 4: tracking de aperturas, reintentos, manejo de bounces (si el email del cliente rebota, avisa al freelancer — es información valiosa)
- Día 5: marcar pagada (desde la app y con magic link desde el email de resumen) + parada automática de la secuencia

**Semana 3 — Dashboard, billing y lanzamiento**
- Días 1–2: dashboard con aging y totales + calculadora de intereses de demora integrada
- Día 3: Stripe billing (trial 14 días sin tarjeta) + límites por plan
- Días 4–5: landing + onboarding ("sube tu primera factura vencida y Cobra empieza mañana") + email de bienvenida + deploy final

## 6. Pricing

- **Free** — 2 facturas activas en seguimiento (suficiente para probar el "aha": recibir el primer pago tras un recordatorio de Cobra)
- **Autónomo 12 €/mes** — 15 facturas activas, secuencias custom, dominio propio
- **Estudio 29 €/mes** — ilimitadas, multi-marca, varios remitentes

Ancla de valor: una sola factura de 800 € cobrada 3 semanas antes ya paga años de suscripción. Ponlo así de literal en la landing.

## 7. Cómo venderla

**Canal 1 — SEO español de alta intención.** Es tu mejor arma y casi nadie lo trabaja bien:
- "carta reclamación factura impagada" (+ generador gratuito como lead magnet)
- "intereses de demora factura calculadora" (la calculadora de Ley 3/2004 como herramienta gratuita indexable)
- "cómo reclamar una factura impagada a una empresa", "modelo burofax reclamación"
Cada búsqueda es un freelancer CON una factura impagada AHORA MISMO. Intención de compra máxima.

**Canal 2 — Herramientas gratuitas (engineering as marketing, estilo Marc Lou).**
1. Calculadora de intereses de demora
2. Generador de email de reclamación (elige tono → copia el texto → "¿y si esto se enviara solo? → Cobra")
3. "Radiografía del moroso": mete el CIF y te dice datos públicos básicos de la empresa
Cada una es una página SEO + captura de email.

**Canal 3 — Comunidades de autónomos.** Grupos de Facebook/Telegram de autónomos España (son enormes y muy activos), r/ESFreelance, foros de Infoautónomos, X hispano. El tema "morosos" genera hilos con muchísima participación — participa aportando la parte legal (Ley 3/2004, burofax, monitorio) y Cobra aparece solo.

**Canal 4 — Gestorías.** El asesor del autónomo escucha "no me pagan" cada semana y no tiene nada que ofrecer. Programa de referidos para gestorías (20–30% recurrente o descuento a sus clientes). Empieza con 10 gestorías por email/LinkedIn.

**Canal 5 — Contenido "morosidad porno".** Newsletter/hilos sobre casos reales anonimizados de impagos y cómo se resolvieron. El freelancer español tiene un trauma colectivo con esto; el contenido se comparte solo.

**Nota DAC7/Hacienda (de tu investigación previa):** Cobra en v1 no emite facturas ni procesa pagos → tu exposición regulatoria directa es baja. Documenta igualmente el tratamiento de datos (facturas de terceros con datos fiscales = GDPR serio) y deja Verifactu/factura electrónica B2B (llega con la Ley Crea y Crece) como argumento de roadmap, no de MVP.

## 8. Validación y criterios de corte

- **Semana 0 (antes de escribir código):** publica en 3 grupos de autónomos: "¿cuánto dinero tienes ahora mismo en facturas vencidas?" Las respuestas te dan validación, copy para la landing y tus primeros beta testers.
- Beta con 10 freelancers reales antes del lanzamiento público — el momento "me han pagado por un email que envió Cobra" es tu primer testimonio.
- Objetivo mes 1 post-lanzamiento: 50 registros, 10 de pago.
- Métrica de producto que importa: **facturas cobradas tras recordatorio de Cobra** (súmala y exhíbela: "Cobra ha recuperado X € para sus usuarios").
- Kill criteria: si tras 100 registros la activación (primera factura subida) es <40%, el onboarding falla; si la activación es alta pero nadie convierte a pago tras el trial, el free tier es demasiado generoso — baja a 1 factura activa.

## 9. Riesgos

- **Entregabilidad:** si los recordatorios caen en spam, el producto no existe. Dominio verificado por usuario, warm-up, copy sin spam-triggers, monitorización de bounces. Es la parte técnica donde más tienes que invertir.
- **"Esto lo hace Holded":** Holded tiene recordatorios básicos, pero enterrados y sin escalado de tono ni intereses de demora. Tu defensa: foco absoluto + funcionar sin cambiar de herramienta de facturación.
- **Mercado con fama de no pagar software:** el autónomo español es sensible al precio. Por eso el free tier existe y el precio ancla contra dinero recuperado, no contra "productividad".
- **Riesgo reputacional del tono:** un recordatorio demasiado agresivo enviado "en nombre del" freelancer puede dañar SU relación con SU cliente. Las plantillas por defecto deben ser impecables y el escalado siempre visible/editable antes de activarse.
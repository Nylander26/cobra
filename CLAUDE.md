# Cobra

Recordatorios de cobro automáticos para freelancers españoles. Plan completo: `../00-cobra-plan-completo.md`.

## Stack

- Next.js 16.3 (preview) — App Router, Turbopack, **`cacheComponents: true` desde el día 1**
- Drizzle ORM + Neon Postgres (`src/db/`)
- Better-Auth (`src/lib/auth.ts`, handler en `src/app/api/auth/[...all]/route.ts`)
- Resend (envío en nombre del usuario, dominio verificado), Vercel Cron, Stripe, Vercel Blob/R2

## Cache Components — reglas de la casa

El flag está activo desde el inicio: **no se escribe código que luego haya que migrar.**

- Nunca `await cookies()`, `headers()`, `params` o `searchParams` en el top-level de un page/layout. Empuja la lectura a un hijo envuelto en `<Suspense>`; para `params`/`searchParams` pasa la promesa al hijo y haz `await` allí.
- Nada de `new Date()`, `Date.now()`, `Math.random()`, `crypto.randomUUID()` en module/render scope. Datos estables → `"use cache"` + `cacheLife`; por-request → `await connection()` + `<Suspense>`.
- Suspense boundaries granulares y content-shaped. Prohibido el skeleton de página completa o `fallback={null}` sobre contenido visible.
- `export const instant = false` solo como Block deliberado con comentario explicando por qué.

## Skills (en `.claude/skills/`)

- `next-dev-loop` — verificación runtime tras cada cambio (`/_next/mcp` + `agent-browser`). Úsala; un build verde no prueba comportamiento.
- `next-cache-components-optimizer` — crecer el static shell / navegación instantánea. Fase de optimización, no de desarrollo.
- `next-cache-components-adoption` — referencia de patrones y recetas de errores blocking-prerender (aquí no hay migración: greenfield).

## Convenciones

- Dinero en céntimos (`amountCents: integer`), nunca float.
- `reminders` se materializa al crear la factura; el cron solo consulta `scheduled_at <= now AND sent_at IS NULL`.
- Emails salen del dominio del usuario (o "en nombre de"); la entregabilidad ES el producto.
- Copy de plantillas en español profesional — es producto, no relleno.

## Comandos

```bash
pnpm dev            # Turbopack dev server
pnpm build          # build de producción (gate por-feature)
pnpm db:generate    # generar migraciones desde src/db/schema.ts
pnpm db:migrate     # aplicar migraciones
pnpm db:studio      # Drizzle Studio
```

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

**Keep this block, including in commits.** It is part of the project's agent setup, maintained by `next dev` for every agent that works here. If it appears as an uncommitted change, that is intentional — commit it as-is. Do not remove it to clean up a diff; it will be regenerated.
<!-- END:nextjs-agent-rules -->

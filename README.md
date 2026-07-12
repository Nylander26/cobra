# Cobra

Recordatorios de cobro automáticos para freelancers españoles. Cobra persigue tus facturas por ti: recordatorios educados, en tu nombre, hasta que te pagan.

## Stack

- **Next.js 16.3** (App Router, Turbopack, Cache Components)
- **Drizzle ORM** + **Neon Postgres**
- **Better-Auth** (email + password)
- Resend · Vercel Cron · Stripe · Vercel Blob/R2

## Desarrollo

```bash
pnpm install
cp .env.example .env.local   # rellena DATABASE_URL, BETTER_AUTH_SECRET, ...
pnpm db:migrate              # crea las tablas en Neon
pnpm dev                     # http://localhost:3000
```

## Scripts

| Comando | Descripción |
|---|---|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Build de producción |
| `pnpm db:generate` | Generar migración desde `src/db/schema.ts` |
| `pnpm db:migrate` | Aplicar migraciones |
| `pnpm db:studio` | Drizzle Studio |

Convenciones y reglas de Cache Components en [`CLAUDE.md`](./CLAUDE.md).

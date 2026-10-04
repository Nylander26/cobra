// Embudo de activación por campaña: de cada alta, hasta dónde llegó. Existe
// porque el coste por clic no dice nada —una campaña puede traer visitas
// baratas que nunca registran una factura— y la cifra que decide si un anuncio
// paga es cuánto cuesta un usuario que mete su PRIMERA factura.
//
// La campaña sale de la atribución que el alta guarda en `events`
// (`meta_attrib`), no de Meta: sobrevive al adblock, a iOS y a los cambios de
// ventana de atribución.
//
//   node scripts/embudo.mjs                 → rama dev (DATABASE_URL)
//   node scripts/embudo.mjs --prod          → producción (DATABASE_URL_PROD)
//   node scripts/embudo.mjs --prod --dias 14  → solo altas de los últimos 14 días
//
// Para el coste por primera factura: gasto de la campaña en Meta ÷ columna
// "1ª fact.".

import { neon } from "@neondatabase/serverless";

const prod = process.argv.includes("--prod");
const url = prod ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL;
if (!url) {
  console.error(
    `Falta ${prod ? "DATABASE_URL_PROD" : "DATABASE_URL"} en el entorno.`,
  );
  process.exit(1);
}
const sql = neon(url);

const idxDias = process.argv.indexOf("--dias");
const dias = idxDias > -1 ? Number(process.argv[idxDias + 1]) : 3650;
if (!Number.isFinite(dias) || dias <= 0) {
  console.error("--dias necesita un número positivo.");
  process.exit(1);
}

const filas = await sql`
  with atribucion as (
    select distinct on (user_id)
      user_id,
      coalesce(payload->'campana'->>'campaign', payload->'campana'->>'source') as campana
    from events
    where type = 'meta_attrib'
    order by user_id, created_at asc
  )
  select
    coalesce(a.campana, '(directo)') as campana,
    count(*)::int as altas,
    count(*) filter (where u.email_verified)::int as verificados,
    count(*) filter (where exists (
      select 1 from events e where e.user_id = u.id and e.type = 'invoice_created'
    ))::int as primera_factura,
    count(*) filter (where s.stripe_subscription_id is not null)::int as prueba,
    count(*) filter (where exists (
      select 1 from events e where e.user_id = u.id and e.type = 'meta_purchase_sent'
    ))::int as pago
  from "user" u
  left join atribucion a on a.user_id = u.id
  left join subscriptions s on s.user_id = u.id
  where u.created_at > now() - make_interval(days => ${dias})
  group by 1
  order by altas desc
`;

const pct = (parte, total) =>
  total > 0 ? `${Math.round((parte / total) * 100)}%`.padStart(5) : "    -";

console.log(
  `\n${prod ? "PRODUCCIÓN" : "dev"} — embudo de activación` +
    (idxDias > -1 ? ` (últimos ${dias} días)` : "") +
    "\n",
);
console.log(
  `  ${"Campaña".padEnd(28)} ${"Altas".padStart(6)} ${"Verif.".padStart(12)}` +
    ` ${"1ª fact.".padStart(12)} ${"Prueba".padStart(12)} ${"Pago".padStart(12)}`,
);
for (const f of filas) {
  console.log(
    `  ${f.campana.slice(0, 28).padEnd(28)} ${String(f.altas).padStart(6)}` +
      ` ${String(f.verificados).padStart(6)} ${pct(f.verificados, f.altas)}` +
      ` ${String(f.primera_factura).padStart(6)} ${pct(f.primera_factura, f.altas)}` +
      ` ${String(f.prueba).padStart(6)} ${pct(f.prueba, f.altas)}` +
      ` ${String(f.pago).padStart(6)} ${pct(f.pago, f.altas)}`,
  );
}
console.log("");

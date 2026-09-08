// Lectura del embudo de leads. Existe porque no hay panel de administración y
// la pregunta que decide si la campaña sigue viva —cuánto cuesta un correo y
// cuántos acaban en cuenta— no se responde desde el dashboard del producto.
//
//   node scripts/leads.mjs          → rama dev (DATABASE_URL)
//   node scripts/leads.mjs --prod   → producción (DATABASE_URL_PROD)

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

const euros = (cents) =>
  ((cents ?? 0) / 100).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

const [totales] = await sql`
  select
    count(*)::int as leads,
    count(converted_at)::int as convertidos,
    coalesce(avg(amount_cents), 0)::int as importe_medio
  from leads
`;

console.log(`\n${prod ? "PRODUCCIÓN" : "dev"} — embudo de leads\n`);
console.log(`  Leads captados : ${totales.leads}`);
console.log(
  `  Convertidos    : ${totales.convertidos}` +
    (totales.leads > 0
      ? `  (${((totales.convertidos / totales.leads) * 100).toFixed(1)} %)`
      : ""),
);
console.log(`  Factura media  : ${euros(totales.importe_medio)}`);

// De qué anuncio vino cada correo. Es el cruce que Meta no puede dar: sobrevive
// al adblock, a iOS y a los cambios de ventana de atribución.
const porCampana = await sql`
  select
    coalesce(campana->>'campaign', campana->>'source', '(directo)') as campana,
    count(*)::int as leads,
    count(converted_at)::int as convertidos
  from leads
  group by 1
  order by leads desc
`;

console.log(`\n  Por campaña`);
for (const c of porCampana) {
  console.log(
    `    ${c.campana.padEnd(28)} ${String(c.leads).padStart(4)} leads` +
      `  ${String(c.convertidos).padStart(3)} altas`,
  );
}

const ultimos = await sql`
  select email, amount_cents, claimable_cents, converted_at, created_at
  from leads
  order by created_at desc
  limit 10
`;

console.log(`\n  Últimos ${ultimos.length}`);
for (const l of ultimos) {
  const cuando = new Date(l.created_at).toLocaleString("es-ES");
  console.log(
    `    ${cuando}  ${l.email.padEnd(32)} ` +
      `factura ${euros(l.amount_cents).padStart(10)} ` +
      `reclamable ${euros(l.claimable_cents).padStart(9)}` +
      `${l.converted_at ? "  ✓ alta" : ""}`,
  );
}
console.log("");

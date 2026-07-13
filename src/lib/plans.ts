export type PlanId = "free" | "autonomo" | "estudio";

// Funcionalidades premium "gateables" por plan. Los límites numéricos NO son
// capabilities (ver activeInvoiceLimit / brandLimit). Estas son las puertas
// on/off que cada plan abre; se van construyendo por tareas.
export type PlanFeature =
  | "custom_sequences" // editar la secuencia de recordatorios
  | "multi_brand" // varias marcas (empresa + remitente + logo) bajo una cuenta
  | "html_branding"; // correos HTML con el logo de la marca (toggle por marca)
// "own_domain" (dominio propio, por marca, plan Estudio) queda aplazado (ver
// TODO.md): no se anuncia ni se gatea todavía. Se añadirá aquí cuando exista
// la verificación de dominios.

export type Plan = {
  id: PlanId;
  name: string;
  priceCents: number; // 0 = gratis
  // Máximo de facturas "en seguimiento" (estado 'sent', no pagadas). null = ilimitado.
  activeInvoiceLimit: number | null;
  // Máximo de marcas (toda cuenta tiene al menos su marca por defecto).
  brandLimit: number;
  // Puertas premium que abre este plan (fuente de verdad para el gating).
  capabilities: PlanFeature[];
  // Bullets de marketing de las cards de precios. Texto libre, no se gatea.
  features: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceCents: 0,
    activeInvoiceLimit: 2,
    brandLimit: 1,
    capabilities: [],
    features: ["2 facturas activas en seguimiento", "Secuencia por defecto"],
  },
  autonomo: {
    id: "autonomo",
    name: "Autónomo",
    priceCents: 1200,
    activeInvoiceLimit: 15,
    brandLimit: 1,
    capabilities: ["custom_sequences"],
    features: ["15 facturas activas", "Secuencias personalizadas"],
  },
  estudio: {
    id: "estudio",
    name: "Estudio",
    priceCents: 2900,
    activeInvoiceLimit: null,
    brandLimit: 3,
    capabilities: ["custom_sequences", "multi_brand", "html_branding"],
    features: [
      "Facturas ilimitadas",
      "Hasta 3 marcas con su remitente",
      "Correos HTML con tu logo",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "autonomo", "estudio"];

// Metadatos legibles por feature (copy de los candados/upsell).
export const FEATURES: Record<PlanFeature, { label: string }> = {
  custom_sequences: { label: "Secuencias personalizadas" },
  multi_brand: { label: "Multi-marca" },
  html_branding: { label: "Correos HTML con tu logo" },
};

// ¿El plan incluye esta feature?
export function planHas(plan: PlanId, feature: PlanFeature): boolean {
  return PLANS[plan].capabilities.includes(feature);
}

// Plan más barato (según PLAN_ORDER) que desbloquea la feature; null si ninguno.
export function minPlanFor(feature: PlanFeature): PlanId | null {
  for (const id of PLAN_ORDER) {
    if (PLANS[id].capabilities.includes(feature)) return id;
  }
  return null;
}

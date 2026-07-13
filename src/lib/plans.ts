export type PlanId = "free" | "autonomo" | "estudio";

// Funcionalidades premium "gateables" por plan. El límite de facturas activas
// NO es una capability (es un número: ver activeInvoiceLimit). Estas son las
// puertas on/off que cada plan abre; se van construyendo por tareas.
export type PlanFeature =
  | "custom_sequences" // editar la secuencia de recordatorios
  | "multiple_senders" // varios remitentes / identidades de envío
  | "multi_brand"; // varias marcas
// "own_domain" (dominio propio) queda aplazado (ver TODO.md): no se anuncia ni
// se gatea todavía. Se añadirá aquí cuando exista la verificación de dominios.

export type Plan = {
  id: PlanId;
  name: string;
  priceCents: number; // 0 = gratis
  // Máximo de facturas "en seguimiento" (estado 'sent', no pagadas). null = ilimitado.
  activeInvoiceLimit: number | null;
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
    capabilities: [],
    features: ["2 facturas activas en seguimiento", "Secuencia por defecto"],
  },
  autonomo: {
    id: "autonomo",
    name: "Autónomo",
    priceCents: 1200,
    activeInvoiceLimit: 15,
    capabilities: ["custom_sequences"],
    features: ["15 facturas activas", "Secuencias personalizadas"],
  },
  estudio: {
    id: "estudio",
    name: "Estudio",
    priceCents: 2900,
    activeInvoiceLimit: null,
    capabilities: ["custom_sequences", "multiple_senders", "multi_brand"],
    features: ["Facturas ilimitadas", "Multi-marca", "Varios remitentes"],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "autonomo", "estudio"];

// Metadatos legibles por feature (copy de los candados/upsell).
export const FEATURES: Record<PlanFeature, { label: string }> = {
  custom_sequences: { label: "Secuencias personalizadas" },
  multiple_senders: { label: "Varios remitentes" },
  multi_brand: { label: "Multi-marca" },
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

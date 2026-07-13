export type PlanId = "free" | "autonomo" | "estudio";

export type Plan = {
  id: PlanId;
  name: string;
  priceCents: number; // 0 = gratis
  // Máximo de facturas "en seguimiento" (estado 'sent', no pagadas). null = ilimitado.
  activeInvoiceLimit: number | null;
  features: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceCents: 0,
    activeInvoiceLimit: 2,
    features: ["2 facturas activas en seguimiento", "Secuencia por defecto"],
  },
  autonomo: {
    id: "autonomo",
    name: "Autónomo",
    priceCents: 1200,
    activeInvoiceLimit: 15,
    features: [
      "15 facturas activas",
      "Secuencias personalizadas",
      "Dominio propio",
    ],
  },
  estudio: {
    id: "estudio",
    name: "Estudio",
    priceCents: 2900,
    activeInvoiceLimit: null,
    features: ["Facturas ilimitadas", "Multi-marca", "Varios remitentes"],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "autonomo", "estudio"];

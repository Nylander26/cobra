// Consentimiento de cookies. Módulo isomorfo a propósito: ni `document` ni
// `next/headers`, para que el banner (cliente) y los endpoints que comprueban
// el consentimiento (servidor) compartan el mismo formato sin duplicarlo.

export const CONSENT_COOKIE = "cobra_consent";

// Subir esta versión invalida los consentimientos ya dados y vuelve a
// preguntar. Es lo único que hay que tocar el día que entre un proveedor nuevo
// (Google Ads, TikTok): el consentimiento viejo no cubría ese tratamiento.
export const CONSENT_VERSION = 1;

// 180 días. La AEPD pide renovar el consentimiento como mucho cada 24 meses;
// medio año lo mantiene fresco sin castigar al visitante recurrente.
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 180;

// Las "necesarias" no se guardan: no son opcionales, no hay nada que decidir.
export type Categorias = {
  analitica: boolean;
  marketing: boolean;
};

export type Consentimiento = Categorias & {
  v: number;
  // Segundos epoch. Es la prueba de cuándo se dio el consentimiento, que el
  // RGPD exige poder acreditar (art. 7.1).
  ts: number;
};

// `null` = no hay decisión válida (nunca decidió, o su decisión es de una
// versión anterior). El llamante debe tratarlo como "todo rechazado".
export function parseConsent(raw: string | null | undefined): Consentimiento | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(decodeURIComponent(raw)) as Partial<Consentimiento>;
    if (data.v !== CONSENT_VERSION) return null;
    return {
      v: CONSENT_VERSION,
      ts: typeof data.ts === "number" ? data.ts : 0,
      // Solo `true` explícito cuenta como consentimiento.
      analitica: data.analitica === true,
      marketing: data.marketing === true,
    };
  } catch {
    return null;
  }
}

export function serializeConsent(valor: Consentimiento): string {
  return encodeURIComponent(JSON.stringify(valor));
}

export function tieneMarketing(consent: Consentimiento | null | undefined): boolean {
  return consent?.marketing === true;
}

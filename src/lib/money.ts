// Money is stored as integer cents everywhere. These are the only two places
// that convert to/from the human euro representation.

// Acepta lo que escribe un usuario español: "1.250,50", "1250,50", "1250.50",
// "1.250" (punto de millar) o "12.5" (decimal). Si conviven punto y coma, el
// último separador es el decimal; si solo hay puntos, un único punto seguido
// de exactamente 3 dígitos se trata como millar.
export function parseAmountToCents(input: string): number | null {
  let normalized = input.trim().replace(/[€\s]/g, "");
  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    normalized =
      lastComma > lastDot
        ? normalized.replace(/\./g, "").replace(",", ".")
        : normalized.replace(/,/g, "");
  } else if (lastComma !== -1) {
    normalized =
      normalized.split(",").length > 2
        ? normalized.replace(/,/g, "")
        : normalized.replace(",", ".");
  } else {
    const dots = normalized.split(".").length - 1;
    if (dots > 1 || (dots === 1 && /\.\d{3}$/.test(normalized))) {
      normalized = normalized.replace(/\./g, "");
    }
  }
  if (!/^\d*\.?\d*$/.test(normalized) || normalized === "" || normalized === ".")
    return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function formatCents(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

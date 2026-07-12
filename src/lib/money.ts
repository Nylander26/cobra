// Money is stored as integer cents everywhere. These are the only two places
// that convert to/from the human euro representation.

export function parseAmountToCents(input: string): number | null {
  const normalized = input.trim().replace(",", ".");
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

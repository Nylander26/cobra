// Prefixed, sortable-enough ids for domain rows. Call only at request time
// (server actions / route handlers) — never in module or render scope, where
// randomness would break Cache Components prerendering.
export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

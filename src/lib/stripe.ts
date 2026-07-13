import Stripe from "stripe";

let cached: Stripe | undefined;

export function stripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY no está configurada");
  cached = new Stripe(key);
  return cached;
}

export function isLiveKey(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live_");
}

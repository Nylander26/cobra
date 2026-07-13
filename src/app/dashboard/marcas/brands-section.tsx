import { FeatureLock } from "@/components/feature-lock";
import { getUserPlan } from "@/lib/billing";
import { getOrCreateDefaultBrand, getUserBrands } from "@/lib/brands";
import { planHas, PLANS } from "@/lib/plans";
import { requireSession } from "@/lib/session";
import { BrandCard } from "./brand-card";
import { NewBrandForm } from "./new-brand-form";

// Dynamic: reads session + plan + brands. Rendered in <Suspense>.
export async function BrandsSection() {
  const { user } = await requireSession();
  const plan = await getUserPlan(user.id);

  // Garantiza la marca por defecto (identidad propia) antes de listar.
  await getOrCreateDefaultBrand(user.id, user.name);
  const list = await getUserBrands(user.id);

  const limit = PLANS[plan].brandLimit;
  const canMulti = planHas(plan, "multi_brand");
  const placeholders = { senderName: user.name, replyTo: user.email };

  return (
    <div className="animate-rise space-y-6">
      {canMulti && (
        <p className="text-sm text-neutral-500">
          Marcas: {list.length} de {limit}
        </p>
      )}

      {list.map((b) => (
        <BrandCard
          key={b.id}
          brand={{
            id: b.id,
            name: b.name,
            senderName: b.senderName,
            replyTo: b.replyTo,
            signature: b.signature,
            isDefault: b.isDefault,
          }}
          placeholders={placeholders}
        />
      ))}

      {canMulti ? (
        list.length < limit ? (
          <NewBrandForm placeholders={placeholders} />
        ) : (
          <p className="text-sm text-neutral-500">
            Has alcanzado el límite de {limit} marcas de tu plan. Elimina una
            para crear otra.
          </p>
        )
      ) : (
        <FeatureLock feature="multi_brand" />
      )}
    </div>
  );
}

export function BrandsSectionFallback() {
  return (
    <div className="space-y-6">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-64 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-900"
        />
      ))}
    </div>
  );
}

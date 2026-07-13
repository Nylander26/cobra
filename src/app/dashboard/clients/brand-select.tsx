import { getUserBrands } from "@/lib/brands";
import { requireSession } from "@/lib/session";

// Selector de marca del alta de cliente. Solo existe cuando el usuario tiene
// más de una marca (Estudio); para el resto no renderiza nada — por eso se
// inyecta como slot con <Suspense fallback={null}> sin romper el shell
// estático del formulario.
export async function BrandSelect() {
  const { user } = await requireSession();
  const brands = await getUserBrands(user.id);
  if (brands.length <= 1) return null;

  return (
    <label className="block space-y-1 sm:col-span-full">
      <span className="text-xs font-medium text-neutral-500">Marca</span>
      <select
        name="brandId"
        className="h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 sm:max-w-xs dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-neutral-400 dark:focus:ring-neutral-400"
      >
        {brands.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
            {b.isDefault ? " (por defecto)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

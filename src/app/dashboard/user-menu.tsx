import { requireSession } from "@/lib/session";
import { SignOutButton } from "./sign-out-button";

// Dynamic: reads the request-time session. Rendered inside a <Suspense>
// boundary so the dashboard shell stays static and this streams in.
export async function UserMenu() {
  const { user } = await requireSession();

  return (
    <div className="flex items-center gap-3">
      {/* En pantallas muy estrechas solo el botón, para no saturar la barra. */}
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
          {user.name}
        </p>
        <p className="text-xs text-neutral-500">{user.email}</p>
      </div>
      <SignOutButton />
    </div>
  );
}

export function UserMenuFallback() {
  return (
    <div className="flex items-center gap-3">
      <div className="space-y-1 text-right">
        <div className="ml-auto h-4 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="ml-auto h-3 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </div>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { CobraMark } from "@/components/logo";
import { Nav } from "./nav";
import { UserMenu, UserMenuFallback } from "./user-menu";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-neutral-50 lg:flex-row dark:bg-neutral-950">
      {/* Barra lateral en lg+, barra superior en móvil/tablet. */}
      <aside className="flex flex-col gap-4 border-b border-neutral-200 bg-white p-4 lg:w-60 lg:gap-6 lg:border-r lg:border-b-0 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-1 text-neutral-900 lg:px-3 dark:text-neutral-50"
          >
            <CobraMark className="h-6 w-6" />
            <span className="font-display text-xl">Cobra</span>
          </Link>
          {/* En móvil el menú de usuario vive aquí; en lg pasa a la cabecera. */}
          <div className="lg:hidden">
            <Suspense fallback={<UserMenuFallback />}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
        <Nav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden h-16 items-center justify-end border-b border-neutral-200 bg-white px-6 lg:flex dark:border-neutral-800 dark:bg-neutral-900">
          <Suspense fallback={<UserMenuFallback />}>
            <UserMenu />
          </Suspense>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

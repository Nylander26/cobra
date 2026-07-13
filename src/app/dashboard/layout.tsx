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
    <div className="flex min-h-dvh bg-neutral-50 dark:bg-neutral-950">
      <aside className="flex w-60 flex-col gap-6 border-r border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 text-neutral-900 dark:text-neutral-50"
        >
          <CobraMark className="h-6 w-6" />
          <span className="font-display text-xl">Cobra</span>
        </Link>
        <Nav />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-end border-b border-neutral-200 bg-white px-6 dark:border-neutral-800 dark:bg-neutral-900">
          <Suspense fallback={<UserMenuFallback />}>
            <UserMenu />
          </Suspense>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

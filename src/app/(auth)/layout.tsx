import Link from "next/link";
import { CobraMark } from "@/components/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-papel px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-tinta"
            aria-label="Cobra — inicio"
          >
            <CobraMark className="h-7 w-7" />
            <span className="font-display text-2xl">Cobra</span>
          </Link>
          <p className="mt-2 text-sm text-grafito/60">
            Persigue tus facturas por ti.
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}

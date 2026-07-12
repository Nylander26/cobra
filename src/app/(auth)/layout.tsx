export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Cobra
          </span>
          <p className="mt-1 text-sm text-neutral-500">
            Persigue tus facturas por ti.
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}

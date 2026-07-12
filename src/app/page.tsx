import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col bg-neutral-50 dark:bg-neutral-950">
      <header className="flex h-16 items-center justify-between px-6">
        <span className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Cobra
        </span>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/login"
            className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50"
          >
            Entrar
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-neutral-900 px-4 py-2 font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Empezar gratis
          </Link>
        </nav>
      </header>

      <section className="mx-auto flex max-w-2xl flex-1 flex-col justify-center px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl dark:text-neutral-50">
          Cobra persigue tus facturas por ti
        </h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
          Recordatorios automáticos, educados y en tu nombre, hasta que te
          pagan. Tú no vuelves a escribir un email incómodo.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Empezar gratis
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-50 dark:hover:bg-neutral-900"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </section>
    </main>
  );
}

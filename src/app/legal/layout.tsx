import Link from "next/link";
import { CobraMark } from "@/components/logo";

// Shell compartida de las páginas legales: papel, columna de lectura y la
// tipografía de la casa. El contenido usa h2/p/ul planos estilizados aquí.
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-papel text-grafito">
      <div className="mx-auto w-full max-w-3xl px-6">
        <header className="flex h-20 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-tinta"
            aria-label="Cobra — inicio"
          >
            <CobraMark className="h-7 w-7" />
            <span className="font-display text-2xl">Cobra</span>
          </Link>
          <nav className="flex gap-5 text-sm text-grafito/60">
            <Link href="/legal/aviso-legal" className="hover:text-cobra">
              Aviso legal
            </Link>
            <Link href="/legal/privacidad" className="hover:text-cobra">
              Privacidad
            </Link>
            <Link href="/legal/condiciones" className="hover:text-cobra">
              Condiciones
            </Link>
          </nav>
        </header>

        <article
          className="pb-20 pt-8
            [&_h1]:font-display [&_h1]:text-3xl [&_h1]:tracking-tight [&_h1]:text-tinta
            [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-tinta
            [&_p]:mt-4 [&_p]:text-[15px] [&_p]:leading-relaxed
            [&_ul]:mt-4 [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:list-disc [&_li]:text-[15px] [&_li]:leading-relaxed
            [&_a]:text-cobra [&_a]:underline [&_a]:underline-offset-4
            [&_strong]:font-semibold [&_strong]:text-tinta"
        >
          {children}
        </article>

        <footer className="border-t border-linea py-8 text-sm text-grafito/60">
          <p>
            ¿Dudas sobre estos textos? Escríbenos a{" "}
            <a href="mailto:soporte@micobra.es" className="text-cobra underline underline-offset-4">
              soporte@micobra.es
            </a>
            .
          </p>
        </footer>
      </div>
    </main>
  );
}

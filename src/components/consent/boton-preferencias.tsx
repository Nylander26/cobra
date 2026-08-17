"use client";

import { abrirPreferencias } from "@/lib/consent-store";

// Enlace para los footers y la política de cookies. Solo despacha el evento:
// el banner vive en el layout raíz y se encarga del resto. Así los tres
// footers duplicados (landing y las dos herramientas) no comparten estado.
export function BotonPreferencias({ className }: { className?: string }) {
  return (
    <button type="button" onClick={abrirPreferencias} className={className}>
      Preferencias de cookies
    </button>
  );
}

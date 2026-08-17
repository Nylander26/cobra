"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { tieneMarketing } from "@/lib/consent";
import { useConsent } from "@/lib/consent-store";
import { cargarPixel, PIXEL_ID, revocarPixel, trackPixel } from "@/lib/meta/client";

// Píxel de Meta. Va en el layout raíz como hermano del banner, no dentro de
// él: son dos responsabilidades distintas y un Provider común arrastraría toda
// la app al cliente.
//
// No renderiza nada y no lee cookies en servidor, así que la landing sigue
// prerenderizándose entera.
export function MetaPixel() {
  const consent = useConsent();
  const pathname = usePathname();

  useEffect(() => {
    // `undefined` es "todavía no se ha leído la cookie": ni cargar ni revocar.
    if (consent === undefined) return;

    if (!tieneMarketing(consent)) {
      revocarPixel();
      return;
    }
    if (!PIXEL_ID) return;

    cargarPixel(PIXEL_ID);
    // En una SPA no hay recarga: cada navegación necesita su propio PageView.
    trackPixel("PageView");
  }, [consent, pathname]);

  return null;
}

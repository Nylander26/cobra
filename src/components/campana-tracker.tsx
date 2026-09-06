"use client";

import { useEffect } from "react";
import { useConsent } from "@/lib/consent-store";
import {
  CAMPANA_COOKIE,
  CAMPANA_MAX_AGE,
  campanaDeQuery,
  serializeCampana,
} from "@/lib/meta/campana";

// Guarda de qué anuncio viene la visita para que el alta lo sepa después.
//
// Cookie y no sessionStorage: el hook de alta de Better-Auth corre en el
// servidor y solo ve lo que viaja en la request. Con una cookie el dato llega
// solo, sin endpoint nuevo y sin depender de `/api/meta/track` — que además
// exige consentimiento de marketing, y esto es medición propia.
//
// Solo escribe si el visitante aceptó analítica o marketing: es almacenamiento
// en el terminal, así que pasa por el banner como todo lo demás.
export function CampanaTracker() {
  const consent = useConsent();

  useEffect(() => {
    if (!consent) return;
    if (!consent.analitica && !consent.marketing) return;

    const campana = campanaDeQuery(new URLSearchParams(window.location.search));
    // Sin parámetros de campaña no se toca nada: una navegación interna no
    // puede borrar el origen que trajo a esta persona.
    if (!campana) return;

    const seguro = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CAMPANA_COOKIE}=${serializeCampana(campana)}; Path=/; Max-Age=${CAMPANA_MAX_AGE}; SameSite=Lax${seguro}`;
  }, [consent]);

  return null;
}

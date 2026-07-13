"use client";

import { useState } from "react";
import { IconLogout } from "@/components/icons";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    await authClient.signOut();
    // Navegación dura: descarta el estado del cliente de auth en memoria. Con
    // router.push el siguiente signIn podía quedarse colgado y había que
    // recargar a mano para volver a entrar.
    window.location.href = "/login";
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      title="Cerrar sesión"
      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
    >
      <IconLogout className="h-4 w-4" />
      {pending ? "Saliendo…" : "Cerrar sesión"}
    </button>
  );
}

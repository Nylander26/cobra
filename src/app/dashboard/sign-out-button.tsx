"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="text-sm text-neutral-500 transition hover:text-neutral-900 disabled:opacity-50 dark:hover:text-neutral-50"
    >
      {pending ? "Saliendo…" : "Salir"}
    </button>
  );
}

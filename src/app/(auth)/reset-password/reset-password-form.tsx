"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("password"));
    if (newPassword !== String(form.get("confirm"))) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    // El token llega en la URL desde el enlace del correo. Se lee aquí (el
    // handler solo corre en el navegador) para que la página siga siendo
    // estática. Si Better-Auth rechazó el enlace, llega ?error=INVALID_TOKEN
    // sin token y este resetPassword devuelve error: mismo mensaje.
    const token =
      new URLSearchParams(window.location.search).get("token") ?? undefined;

    setPending(true);
    const result = await authClient.resetPassword({ newPassword, token });

    if (result.error) {
      setError(
        result.error.status === 429
          ? "Demasiados intentos seguidos. Espera un rato y vuelve a probar."
          : "El enlace no es válido o ha caducado. Pide uno nuevo desde «Recupera tu contraseña».",
      );
      setPending(false);
      return;
    }
    setDone(true);
    setPending(false);
  }

  if (done) {
    return (
      <div className="animate-rise space-y-3 rounded-2xl border border-linea bg-white p-6 shadow-[0_1px_2px_rgba(18,36,28,0.06)]">
        <h1 className="text-lg font-semibold text-tinta">
          Contraseña cambiada
        </h1>
        <p className="text-sm text-grafito">
          Tu contraseña nueva ya está activa y tu email queda confirmado.
        </p>
        <Link
          href="/login"
          className="inline-block w-full rounded-lg bg-cobra px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-cobra-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="animate-rise space-y-4 rounded-2xl border border-linea bg-white p-6 shadow-[0_1px_2px_rgba(18,36,28,0.06)]"
    >
      <h1 className="text-lg font-semibold text-tinta">
        Elige una contraseña nueva
      </h1>

      <Field
        label="Contraseña nueva"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        minLength={8}
        required
      />
      <Field
        label="Repítela"
        name="confirm"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        minLength={8}
        required
      />

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-cobra px-4 py-2 text-sm font-medium text-white transition hover:bg-cobra-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra disabled:opacity-50"
      >
        {pending ? "…" : "Guardar contraseña"}
      </button>
    </form>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-grafito">{label}</span>
      <input
        {...props}
        className="w-full rounded-lg border border-linea bg-white px-3 py-2 text-sm text-tinta outline-none transition placeholder:text-grafito/40 focus:border-cobra focus:ring-1 focus:ring-cobra"
      />
    </label>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const email = String(new FormData(event.currentTarget).get("email"));
    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });

    if (result.error) {
      setError(
        result.error.status === 429
          ? "Demasiados intentos seguidos. Espera un rato y vuelve a probar."
          : "No se pudo enviar el correo. Inténtalo de nuevo en un momento.",
      );
      setPending(false);
      return;
    }
    setSentTo(email);
    setPending(false);
  }

  if (sentTo) {
    return (
      <div className="animate-rise space-y-3 rounded-2xl border border-linea bg-white p-6 shadow-[0_1px_2px_rgba(18,36,28,0.06)]">
        <h1 className="text-lg font-semibold text-tinta">Revisa tu correo</h1>
        <p className="text-sm text-grafito">
          Si existe una cuenta con{" "}
          <span className="font-medium text-tinta">{sentTo}</span>, te hemos
          enviado un enlace para restablecer la contraseña. Caduca en 1 hora.
        </p>
        <p className="text-sm text-grafito/60">
          ¿No llega? Mira en spam, o comprueba que es el email con el que te
          registraste.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="animate-rise space-y-4 rounded-2xl border border-linea bg-white p-6 shadow-[0_1px_2px_rgba(18,36,28,0.06)]"
    >
      <h1 className="text-lg font-semibold text-tinta">
        Recupera tu contraseña
      </h1>
      <p className="text-sm text-grafito/60">
        Escribe el email de tu cuenta y te enviaremos un enlace para elegir una
        contraseña nueva.
      </p>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-grafito">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          required
          className="w-full rounded-lg border border-linea bg-white px-3 py-2 text-sm text-tinta outline-none transition placeholder:text-grafito/40 focus:border-cobra focus:ring-1 focus:ring-cobra"
        />
      </label>

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
        {pending ? "…" : "Enviar enlace"}
      </button>

      <p className="text-center text-sm text-grafito/60">
        <Link
          href="/login"
          className="font-medium text-cobra underline-offset-4 hover:underline"
        >
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}

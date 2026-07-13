"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type Mode = "login" | "signup";

const copy = {
  login: {
    title: "Inicia sesión",
    submit: "Entrar",
    alt: "¿No tienes cuenta?",
    altHref: "/signup",
    altLabel: "Regístrate",
  },
  signup: {
    title: "Crea tu cuenta",
    submit: "Crear cuenta",
    alt: "¿Ya tienes cuenta?",
    altHref: "/login",
    altLabel: "Inicia sesión",
  },
} as const;

// Mensajes en español para los errores habituales de auth.
function authErrorMessage(status: number, fallback?: string): string {
  if (status === 401) return "Email o contraseña incorrectos.";
  if (status === 429)
    return "Demasiados intentos seguidos. Espera un minuto y vuelve a probar.";
  return fallback ?? "Algo salió mal. Inténtalo de nuevo.";
}

export function AuthForm({ mode }: { mode: Mode }) {
  const t = copy[mode];
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // signup: cuenta creada, esperando el click en el email de verificación.
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const name = String(form.get("name") ?? "");

    const result =
      mode === "signup"
        ? await authClient.signUp.email({
            email,
            password,
            name,
            callbackURL: "/dashboard",
          })
        : await authClient.signIn.email({
            email,
            password,
            callbackURL: "/dashboard",
          });

    if (result.error) {
      // Email sin verificar: Better-Auth NO reenvía el enlace por sí solo al
      // intentar entrar — hay que pedirlo (el servidor lo limita a 3/min).
      if (mode === "login" && result.error.status === 403) {
        const resend = await authClient.sendVerificationEmail({
          email,
          callbackURL: "/dashboard",
        });
        setError(
          resend.error
            ? "Tu email está sin confirmar y ahora mismo no se pudo reenviar el enlace. Espera un minuto y vuelve a intentarlo."
            : "Tu email está sin confirmar. Te acabamos de enviar el enlace de activación: revisa tu bandeja (y la carpeta de spam).",
        );
        setPending(false);
        return;
      }
      setError(
        authErrorMessage(result.error.status, result.error.message ?? undefined),
      );
      setPending(false);
      return;
    }

    // El registro ya no inicia sesión: hasta que confirme el email no entra.
    if (mode === "signup") {
      setSentTo(email);
      setPending(false);
      return;
    }

    // Navegación dura para que los server components vean la sesión recién
    // creada y el estado del cliente arranque limpio. `pending` sigue activo
    // hasta que la página se descarga (botón deshabilitado durante el salto).
    const next =
      new URLSearchParams(window.location.search).get("next") ?? "/dashboard";
    window.location.href = next;
  }

  if (sentTo) {
    return (
      <div className="animate-rise space-y-3 rounded-2xl border border-linea bg-white p-6 shadow-[0_1px_2px_rgba(18,36,28,0.06)]">
        <h1 className="text-lg font-semibold text-tinta">Revisa tu correo</h1>
        <p className="text-sm text-grafito">
          Te hemos enviado un enlace de activación a{" "}
          <span className="font-medium text-tinta">{sentTo}</span>. Haz clic
          para confirmar tu cuenta y entrar.
        </p>
        <p className="text-sm text-grafito/60">
          ¿No llega? Mira en spam. Al intentar iniciar sesión te lo
          reenviamos.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="animate-rise space-y-4 rounded-2xl border border-linea bg-white p-6 shadow-[0_1px_2px_rgba(18,36,28,0.06)]"
    >
      <h1 className="text-lg font-semibold text-tinta">{t.title}</h1>

      {mode === "signup" && (
        <Field
          label="Nombre"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Tu nombre"
          required
        />
      )}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="tu@email.com"
        required
      />
      <Field
        label="Contraseña"
        name="password"
        type="password"
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
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
        {pending ? "…" : t.submit}
      </button>

      <p className="text-center text-sm text-grafito/60">
        {t.alt}{" "}
        <Link
          href={t.altHref}
          className="font-medium text-cobra underline-offset-4 hover:underline"
        >
          {t.altLabel}
        </Link>
      </p>
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

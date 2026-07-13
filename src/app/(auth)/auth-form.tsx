"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

export function AuthForm({ mode }: { mode: Mode }) {
  const t = copy[mode];
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });

    if (result.error) {
      setError(result.error.message ?? "Algo salió mal. Inténtalo de nuevo.");
      setPending(false);
      return;
    }

    const next =
      new URLSearchParams(window.location.search).get("next") ?? "/dashboard";
    router.push(next);
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-linea bg-white p-6 shadow-[0_1px_2px_rgba(18,36,28,0.06)]"
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

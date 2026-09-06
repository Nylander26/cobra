"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { trackMeta } from "@/lib/meta/client";

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
  const [noCoincide, setNoCoincide] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const name = String(form.get("name") ?? "");

    // Una errata en la contraseña del alta no se descubre hasta el siguiente
    // inicio de sesión, cuando ya no hay forma de saber qué se escribió: se
    // comprueba aquí, antes de crear nada.
    if (mode === "signup" && password !== String(form.get("passwordConfirm"))) {
      setNoCoincide(true);
      return;
    }

    setPending(true);

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
      // Lead, no CompleteRegistration: la cuenta todavía no está activa. La
      // activación real (verificar el email) la reporta el servidor, que es
      // quien se entera aunque el usuario haga clic desde otro dispositivo.
      // Sin await: la medición no puede retrasar la pantalla de "revisa tu
      // correo" ni romperla si Meta falla.
      void trackMeta("Lead", { email });
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
      <CampoContrasena
        label="Contraseña"
        name="password"
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        minLength={8}
        required
      />
      {mode === "signup" && (
        <CampoContrasena
          label="Repite la contraseña"
          name="passwordConfirm"
          autoComplete="new-password"
          minLength={8}
          required
          aria-invalid={noCoincide}
          aria-describedby={noCoincide ? "password-confirm-error" : undefined}
          onInput={() => setNoCoincide(false)}
          error={
            noCoincide ? "Las dos contraseñas no coinciden." : undefined
          }
        />
      )}

      {mode === "login" && (
        <p className="text-right text-sm">
          <Link
            href="/forgot-password"
            className="text-grafito/60 underline-offset-4 hover:text-cobra hover:underline"
          >
            ¿Has olvidado tu contraseña?
          </Link>
        </p>
      )}

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

      {mode === "signup" && (
        <p className="text-center text-xs text-grafito/60">
          Al crear tu cuenta aceptas las{" "}
          <Link
            href="/legal/condiciones"
            className="underline underline-offset-4 hover:text-cobra"
          >
            condiciones del servicio
          </Link>{" "}
          y la{" "}
          <Link
            href="/legal/privacidad"
            className="underline underline-offset-4 hover:text-cobra"
          >
            política de privacidad
          </Link>
          .
        </p>
      )}

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

const CLASES_INPUT =
  "w-full rounded-lg border border-linea bg-white px-3 py-2 text-sm text-tinta outline-none transition placeholder:text-grafito/40 focus:border-cobra focus:ring-1 focus:ring-cobra";

function OjoAbierto() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden="true">
      <path
        d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function OjoTachado() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden="true">
      <path
        d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.6" />
      <path d="m4 20 16-16" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

// Contraseña con ojito. Escribir a ciegas en el móvil —de donde viene casi
// todo el tráfico— es la causa habitual de que alguien se cree una cuenta a la
// que luego no puede entrar.
function CampoContrasena({
  label,
  error,
  ...props
}: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <div className="space-y-1">
      {/* El botón va FUERA del <label>: dentro, su texto se cuela en el nombre
          accesible del campo, que pasa a leerse «Contraseña, mostrar la
          contraseña». De ahí el htmlFor en vez de envolver el input. */}
      <label htmlFor={id} className="block text-sm font-medium text-grafito">
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          id={id}
          type={visible ? "text" : "password"}
          placeholder="••••••••"
          className={`${CLASES_INPUT} pr-11 ${error ? "border-red-400" : ""}`}
        />
        <button
          type="button"
          // No entra en el orden de tabulación: quien va con teclado quiere
          // saltar de la contraseña al botón de enviar, no a un interruptor.
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar la contraseña" : "Mostrar la contraseña"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-grafito/50 transition hover:text-cobra focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra"
        >
          {visible ? <OjoTachado /> : <OjoAbierto />}
        </button>
      </div>
      {error && (
        <p id="password-confirm-error" className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-grafito">{label}</span>
      <input {...props} className={CLASES_INPUT} />
    </label>
  );
}

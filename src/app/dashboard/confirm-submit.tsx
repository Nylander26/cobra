"use client";

// Botón de submit que pide confirmación antes de disparar la server action.
// Va dentro de un <form action={serverAction}>; si el usuario cancela,
// preventDefault detiene el envío. Para acciones destructivas (borrar).
export function ConfirmSubmit({
  message,
  className,
  children,
}: {
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

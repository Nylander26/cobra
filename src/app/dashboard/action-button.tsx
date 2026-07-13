"use client";

import { type ReactNode, useRef, useTransition } from "react";
import { Spinner } from "@/components/icons";

type Confirm = {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
};

// Botón que dispara una server action con estado de carga (spinner). Si se le
// pasa `confirm`, primero abre un modal (en vez de window.confirm): más pulido
// y no salta al inicio de la página. La action recibe el id de la fila.
export function ActionButton({
  action,
  id,
  className,
  icon,
  label,
  confirm,
  title,
}: {
  action: (id: string) => Promise<void>;
  id: string;
  className?: string;
  icon?: ReactNode;
  label: string;
  confirm?: Confirm;
  title?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      await action(id);
      dialogRef.current?.close();
    });
  }

  const confirmTone =
    confirm?.tone === "danger"
      ? "bg-red-600 hover:bg-red-700 focus-visible:outline-red-600"
      : "bg-cobra hover:bg-cobra-oscuro focus-visible:outline-cobra";

  return (
    <>
      <button
        type="button"
        onClick={() => (confirm ? dialogRef.current?.showModal() : run())}
        disabled={pending}
        title={title}
        className={className}
      >
        {pending ? <Spinner className="h-3.5 w-3.5" /> : icon}
        {label}
      </button>

      {confirm && (
        <dialog
          ref={dialogRef}
          // Clic en el backdrop (fuera de la tarjeta) cierra el modal.
          onClick={(e) => {
            if (e.target === dialogRef.current) dialogRef.current?.close();
          }}
          className="m-auto w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-neutral-200 bg-white p-0 text-left text-neutral-900 shadow-xl backdrop:bg-neutral-950/40 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50"
        >
          <div className="p-6">
            <h3 className="text-base font-semibold">{confirm.title}</h3>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {confirm.message}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                disabled={pending}
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={run}
                disabled={pending}
                className={`inline-flex min-w-[7rem] items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-70 ${confirmTone}`}
              >
                {pending ? <Spinner className="h-4 w-4" /> : confirm.confirmLabel}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}

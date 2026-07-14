"use client";

import { useRef, useState } from "react";
import { IconEye } from "@/components/icons";
import { renderBrandedEmail } from "@/lib/email/html";
import { buildReminderVars, renderTemplate } from "@/lib/templates";

// Datos que el servidor resuelve para poder previsualizar el correo igual que
// lo compone el envío real (src/lib/reminders/send.ts): remitente efectivo por
// marca, dirección de salida y si la marca envía HTML.
export type PreviewBrand = {
  id: string;
  name: string;
  fromName: string; // senderName || name, como en el envío
  replyTo: string; // brand.replyTo || email del usuario
  signature: string | null;
  logoUrl: string | null; // ruta pública del logo (misma que usa el correo)
  htmlEmails: boolean; // true = plantilla HTML con marca (Estudio)
};

export type EmailPreviewData = {
  fromAddress: string; // dirección real de salida; el nombre lo pone la marca
  brands: PreviewBrand[]; // la por defecto primero
};

// Factura de ejemplo con la que se rellenan las {{variables}}.
const SAMPLE = {
  number: "2026-014",
  amountCents: 121_000,
  currency: "EUR",
  company: "Estudio Ejemplo S.L.",
  contactName: "María",
  billingEmail: "facturacion@estudioejemplo.es",
};

const DAY_MS = 24 * 60 * 60 * 1000;

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-24 shrink-0 text-neutral-400">{label}</span>
      <span className="min-w-0 break-words text-neutral-700 dark:text-neutral-300">
        {value}
      </span>
    </div>
  );
}

export function StepPreviewButton({
  step,
  preview,
}: {
  step: { offsetDays: number; subject: string; body: string };
  preview: EmailPreviewData;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [brandId, setBrandId] = useState(preview.brands[0].id);
  // Instante capturado al abrir (en el handler, nunca en render: Cache
  // Components e hidratación). Fecha la factura de ejemplo para que "hoy"
  // sea el día en que sale este paso.
  const [openedAt, setOpenedAt] = useState<number | null>(null);

  const brand =
    preview.brands.find((b) => b.id === brandId) ?? preview.brands[0];

  function open() {
    setOpenedAt(Date.now());
    dialogRef.current?.showModal();
  }

  const vars =
    openedAt === null
      ? null
      : buildReminderVars({
          invoice: {
            number: SAMPLE.number,
            amountCents: SAMPLE.amountCents,
            currency: SAMPLE.currency,
            dueAt: new Date(openedAt - step.offsetDays * DAY_MS),
          },
          client: {
            company: SAMPLE.company,
            contactName: SAMPLE.contactName,
          },
          sender: {
            name: brand.fromName,
            senderName: brand.fromName,
            signature: brand.signature,
          },
          now: openedAt,
        });

  const subject = vars ? renderTemplate(step.subject, vars) : "";
  const text = vars ? renderTemplate(step.body, vars) : "";
  const html =
    vars && brand.htmlEmails
      ? renderBrandedEmail({
          bodyText: text,
          brandName: brand.name,
          logoUrl: brand.logoUrl,
          reference: {
            numero: vars.numero,
            vencimiento: vars.vencimiento,
            importe: vars.importe,
          },
        })
      : null;

  return (
    <>
      <button
        type="button"
        onClick={open}
        title="Ver el correo como lo recibirá tu cliente"
        className="flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-medium text-neutral-600 transition hover:border-cobra hover:text-cobra dark:border-neutral-700 dark:text-neutral-300"
      >
        <IconEye className="h-4 w-4" />
        Vista previa
      </button>

      <dialog
        ref={dialogRef}
        // Clic en el backdrop (fuera de la tarjeta) cierra el modal.
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="m-auto w-[calc(100vw-2rem)] max-w-2xl rounded-2xl border border-neutral-200 bg-white p-0 text-left text-neutral-900 shadow-xl backdrop:bg-neutral-950/40 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50"
      >
        <div className="space-y-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Vista previa del correo</h3>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Cerrar"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              ✕
            </button>
          </div>

          {preview.brands.length > 1 && (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-neutral-500">Marca</span>
              <select
                value={brand.id}
                onChange={(e) => setBrandId(e.target.value)}
                className="h-9 rounded-lg border border-neutral-300 bg-white px-2 text-sm text-neutral-900 outline-none transition focus:border-cobra focus:ring-1 focus:ring-cobra dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50"
              >
                {preview.brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="space-y-1.5 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950/50">
            <MetaRow
              label="De"
              value={`${brand.fromName} <${preview.fromAddress}>`}
            />
            <MetaRow
              label="Para"
              value={`${SAMPLE.company} <${SAMPLE.billingEmail}>`}
            />
            <MetaRow label="Responder a" value={brand.replyTo} />
            <div className="flex gap-2 pt-1 text-sm">
              <span className="w-24 shrink-0 text-neutral-400">Asunto</span>
              <span className="min-w-0 break-words font-medium">
                {subject || "(sin asunto)"}
              </span>
            </div>
          </div>

          {html ? (
            <iframe
              title="Vista previa del correo"
              sandbox=""
              srcDoc={html}
              className="h-[560px] w-full rounded-lg border border-neutral-200 bg-white dark:border-neutral-800"
            />
          ) : (
            <div className="whitespace-pre-wrap rounded-lg border border-neutral-200 bg-white p-5 font-serif text-[15px] leading-relaxed text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100">
              {text || "(sin mensaje)"}
            </div>
          )}

          <p className="text-xs text-neutral-400">
            {html
              ? "Datos de ejemplo; cada envío usa los de la factura real. La versión en texto plano se adjunta siempre."
              : "Datos de ejemplo; cada envío usa los de la factura real. Este correo sale en texto plano."}
          </p>
        </div>
      </dialog>
    </>
  );
}

"use client";

import { useActionState } from "react";
import { IconTrash } from "@/components/icons";
import { ActionButton } from "../action-button";
import {
  type BrandFormState,
  deleteBrand,
  removeBrandLogo,
  saveBrand,
} from "./actions";

export type BrandData = {
  id: string;
  name: string;
  senderName: string | null;
  replyTo: string | null;
  signature: string | null;
  isDefault: boolean;
  logoUrl: string | null;
  htmlEmails: boolean;
};

export type BrandPlaceholders = {
  senderName: string; // nombre del usuario
  replyTo: string; // email del usuario
};

const inputBase =
  "rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-cobra focus:ring-1 focus:ring-cobra dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50";

const initial: BrandFormState = {};

// Campos comunes del formulario de marca (edición y alta).
export function BrandFields({
  defaults,
  placeholders,
}: {
  defaults?: BrandData;
  placeholders: BrandPlaceholders;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Nombre de la marca
          </span>
          <input
            type="text"
            name="name"
            required
            maxLength={120}
            defaultValue={defaults?.name ?? ""}
            placeholder="Estudio López"
            className={`h-10 w-full px-3 ${inputBase}`}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Nombre del remitente
          </span>
          <input
            type="text"
            name="senderName"
            maxLength={120}
            defaultValue={defaults?.senderName ?? ""}
            placeholder={placeholders.senderName}
            className={`h-10 w-full px-3 ${inputBase}`}
          />
          <span className="block text-xs text-neutral-400">
            El &quot;De:&quot; del correo. Vacío = el nombre de la marca.
          </span>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Email de respuesta
          </span>
          <input
            type="email"
            name="replyTo"
            maxLength={200}
            defaultValue={defaults?.replyTo ?? ""}
            placeholder={placeholders.replyTo}
            className={`h-10 w-full px-3 ${inputBase}`}
          />
          <span className="block text-xs text-neutral-400">
            Adónde llegan las respuestas de tus clientes. Vacío = tu email de
            la cuenta.
          </span>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Firma
          </span>
          <textarea
            name="signature"
            rows={3}
            maxLength={500}
            defaultValue={defaults?.signature ?? ""}
            placeholder={`${placeholders.senderName}\n612 345 678`}
            className={`w-full resize-y px-3 py-2 ${inputBase}`}
          />
          <span className="block text-xs text-neutral-400">
            Se inserta donde uses {"{{firma}}"} en tus plantillas.
          </span>
        </label>
      </div>
    </>
  );
}

export function BrandCard({
  brand,
  placeholders,
  canHtml = false,
}: {
  brand: BrandData;
  placeholders: BrandPlaceholders;
  // Plan con html_branding (Estudio): muestra logo + toggle de correo HTML.
  canHtml?: boolean;
}) {
  const [state, action, pending] = useActionState(saveBrand, initial);

  return (
    <form
      action={action}
      className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <input type="hidden" name="id" value={brand.id} />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-50">
            {brand.name}
          </h2>
          {brand.isDefault && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              Por defecto
            </span>
          )}
        </div>
        {!brand.isDefault && (
          <ActionButton
            action={deleteBrand}
            id={brand.id}
            label="Eliminar"
            icon={<IconTrash className="h-3.5 w-3.5" />}
            title="Eliminar marca"
            confirm={{
              title: "¿Eliminar esta marca?",
              message:
                "Sus clientes pasarán a tu marca por defecto y los próximos recordatorios saldrán con ese remitente.",
              confirmLabel: "Eliminar",
              tone: "danger",
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:border-red-300 hover:text-red-600 disabled:opacity-50 dark:border-neutral-700"
          />
        )}
      </div>

      <BrandFields defaults={brand} placeholders={placeholders} />

      {canHtml && (
        <div className="space-y-3 rounded-lg border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950/50">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Correo con tu marca
          </p>

          {brand.logoUrl && (
            <div className="flex items-center gap-3">
              {/* data-URL del logo; se renderiza tal cual */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brand.logoUrl}
                alt={`Logo de ${brand.name}`}
                className="h-10 max-w-[10rem] rounded bg-white object-contain p-1 ring-1 ring-neutral-200 dark:ring-neutral-700"
              />
              <ActionButton
                action={removeBrandLogo}
                id={brand.id}
                label="Quitar logo"
                title="Quitar logo"
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:border-red-300 hover:text-red-600 dark:border-neutral-700"
              />
            </div>
          )}

          <label className="block space-y-1">
            <span className="text-xs text-neutral-500">
              {brand.logoUrl ? "Sustituir logo" : "Logo"} (PNG, JPG o WebP,
              máx. 300 KB)
            </span>
            <input
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/webp"
              className="block w-full text-sm text-neutral-600 file:mr-3 file:h-9 file:cursor-pointer file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-200 dark:text-neutral-400 dark:file:bg-neutral-800 dark:file:text-neutral-200 dark:hover:file:bg-neutral-700"
            />
          </label>

          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              name="htmlEmails"
              defaultChecked={brand.htmlEmails}
              className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-cobra"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              Enviar los recordatorios en HTML con esta marca
              <span className="block text-xs text-neutral-400">
                Desactivado, van en texto plano: parecen escritos a mano y
                suelen cobrar mejor. Actívalo si prefieres un correo con tu
                logo, más formal.
              </span>
            </span>
          </label>
        </div>
      )}

      {state.ok && (
        <p
          role="status"
          className="rounded-lg border border-cobra/30 bg-cobra/10 px-3 py-2 text-sm text-cobra dark:text-verde-claro"
        >
          Marca guardada.
        </p>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-cobra px-5 py-2.5 text-sm font-medium text-white transition hover:bg-cobra-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

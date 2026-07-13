"use server";

import { redirect } from "next/navigation";
import { verifyMarkPaidToken } from "@/lib/magic-link";
import { markInvoicePaidCore } from "@/lib/invoices/mark-paid";

// Confirmación del magic-link: el token firmado ES la autorización (esa
// factura, ese usuario), no hay sesión. Se re-verifica aquí porque el POST
// llega con lo que el cliente envíe, no con lo que el GET mostró.
export async function confirmMarkPaid(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const payload = verifyMarkPaidToken(token, Date.now());
  if (!payload) redirect(`/pagada/${encodeURIComponent(token)}`);

  await markInvoicePaidCore(payload.userId, payload.invoiceId, "magic_link");

  // Vuelta a la misma página: recarga el estado (ya pagada) con el toque
  // de éxito. Si no se pudo marcar (ya pagada antes), muestra ese estado.
  redirect(`/pagada/${encodeURIComponent(token)}?ok=1`);
}

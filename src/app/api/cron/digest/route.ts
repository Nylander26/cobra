import { NextResponse } from "next/server";
import { sendWeeklyDigests } from "@/lib/digest/send";
import { sendOpsAlert } from "@/lib/ops-alert";

// Resumen semanal (lunes por la mañana, ver vercel.json). Misma protección
// que el cron de recordatorios: Bearer CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  try {
    const summary = await sendWeeklyDigests();
    if (summary.failed > 0) {
      await sendOpsAlert(`resumen semanal: ${summary.failed} envíos fallidos`, [
        `Ejecución del cron del resumen (${new Date().toISOString()}):`,
        `- usuarios con facturas abiertas: ${summary.users}`,
        `- enviados: ${summary.sent}`,
        `- fallidos: ${summary.failed}`,
        `- transporte: ${summary.transport}`,
      ]);
    }
    return NextResponse.json(summary);
  } catch (err) {
    await sendOpsAlert("el cron del resumen semanal ha fallado entero", [
      `Error no controlado en /api/cron/digest (${new Date().toISOString()}):`,
      String(err),
    ]);
    return new NextResponse("error", { status: 500 });
  }
}

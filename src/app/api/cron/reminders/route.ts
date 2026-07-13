import { NextResponse } from "next/server";
import { sendOpsAlert } from "@/lib/ops-alert";
import { sendDueReminders } from "@/lib/reminders/send";

// Daily reminder dispatch. Vercel Cron calls this with
// `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set in the project.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  try {
    const summary = await sendDueReminders();
    // Solo hay correo cuando algo va mal: fallos de envío, o un usuario
    // chocando con su tope diario (señal de posible abuso).
    if (summary.failed > 0 || summary.capped > 0) {
      await sendOpsAlert(
        `recordatorios: ${summary.failed} fallidos, ${summary.capped} al tope`,
        [
          `Ejecución del cron de recordatorios (${new Date().toISOString()}):`,
          `- vencidos: ${summary.due}`,
          `- enviados: ${summary.sent}`,
          `- fallidos: ${summary.failed} (se reintentan en el próximo run)`,
          `- pospuestos por tope diario: ${summary.capped}`,
          `- transporte: ${summary.transport}`,
        ],
      );
    }
    return NextResponse.json(summary);
  } catch (err) {
    await sendOpsAlert("el cron de recordatorios ha fallado entero", [
      `Error no controlado en /api/cron/reminders (${new Date().toISOString()}):`,
      String(err),
    ]);
    return new NextResponse("error", { status: 500 });
  }
}

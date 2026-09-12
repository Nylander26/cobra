import { NextResponse } from "next/server";
import { sendDueOwnerAlerts } from "@/lib/burofax/avisos";
import { purgarBorradores } from "@/lib/burofax/borradores";
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

    // Segunda pasada, deliberadamente separada de la primera: estos avisos van
    // al USUARIO sobre los plazos legales de su burofax, no al deudor. Comparten
    // cron porque comparten cadencia diaria, nada más — si uno de los dos
    // revienta, el otro ya ha corrido o corre igual mañana. Por eso lleva su
    // propio try: un fallo aquí (una migración que aún no está en producción,
    // por ejemplo) no puede tumbar un run cuyos recordatorios ya han salido, ni
    // hacerle creer al cron que debe reintentarlos.
    const ahora = new Date();
    let avisos = { enviados: 0, fallidos: 0 };
    let borradosPurgados = 0;
    let falloBurofax: string | null = null;
    try {
      avisos = await sendDueOwnerAlerts(ahora);
      // Y de paso se barren los borradores de burofax caducados: datos
      // personales de terceros que ya no tienen ninguna razón para seguir ahí.
      borradosPurgados = await purgarBorradores(ahora);
    } catch (err) {
      falloBurofax = String(err);
    }
    // Solo hay correo cuando algo va mal: fallos de envío, o un usuario
    // chocando con su tope diario (señal de posible abuso).
    if (
      summary.failed > 0 ||
      summary.capped > 0 ||
      avisos.fallidos > 0 ||
      falloBurofax
    ) {
      await sendOpsAlert(
        `recordatorios: ${summary.failed} fallidos, ${summary.capped} al tope`,
        [
          `Ejecución del cron de recordatorios (${new Date().toISOString()}):`,
          `- vencidos: ${summary.due}`,
          `- enviados: ${summary.sent}`,
          `- fallidos: ${summary.failed} (se reintentan en el próximo run)`,
          `- pospuestos por tope diario: ${summary.capped}`,
          `- transporte: ${summary.transport}`,
          `- avisos al usuario: ${avisos.enviados} enviados, ${avisos.fallidos} fallidos`,
          ...(falloBurofax
            ? [`- la pasada de burofax reventó entera: ${falloBurofax}`]
            : []),
        ],
      );
    }
    return NextResponse.json({
      ...summary,
      avisos,
      borradosPurgados,
      falloBurofax,
    });
  } catch (err) {
    await sendOpsAlert("el cron de recordatorios ha fallado entero", [
      `Error no controlado en /api/cron/reminders (${new Date().toISOString()}):`,
      String(err),
    ]);
    return new NextResponse("error", { status: 500 });
  }
}

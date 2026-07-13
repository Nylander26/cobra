import { NextResponse } from "next/server";
import { sendWeeklyDigests } from "@/lib/digest/send";

// Resumen semanal (lunes por la mañana, ver vercel.json). Misma protección
// que el cron de recordatorios: Bearer CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const summary = await sendWeeklyDigests();
  return NextResponse.json(summary);
}

import { NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/reminders/send";

// Hourly reminder dispatch. Vercel Cron calls this with
// `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set in the project.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const summary = await sendDueReminders();
  return NextResponse.json(summary);
}

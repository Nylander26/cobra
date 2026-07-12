import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { getSession } from "@/lib/session";
import { getSignedDownloadUrl } from "@/lib/storage";

// Redirects to a short-lived presigned URL for the invoice PDF. Objects are
// private in S3; this is the only way to reach them, and only for the owner.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return new NextResponse("No autenticado", { status: 401 });

  const { id } = await params;
  const [invoice] = await db
    .select({ pdfUrl: invoices.pdfUrl })
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, session.user.id)))
    .limit(1);

  if (!invoice?.pdfUrl) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  const url = await getSignedDownloadUrl(invoice.pdfUrl);
  return NextResponse.redirect(url);
}

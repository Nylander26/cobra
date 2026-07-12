import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Reads the request-time session. Because this awaits `headers()`, it is a
// dynamic read — only call it inside a <Suspense> boundary (Cache Components),
// never at the top level of a page or layout.
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

// Same, but redirects to /login when unauthenticated. Returns a non-null session.
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

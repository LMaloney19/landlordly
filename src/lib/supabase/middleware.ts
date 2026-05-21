import { NextResponse, type NextRequest } from "next/server";

/**
 * Do not enforce auth in middleware during local development.
 * Supabase refresh-token races were causing valid users to be redirected to
 * /login while navigating. Pages and API routes handle unauthenticated states
 * with inline errors instead of booting the user out.
 */
export async function updateSession(request: NextRequest) {
  return NextResponse.next({ request });
}

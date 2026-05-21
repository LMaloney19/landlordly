import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { DEFAULT_APP_PATH } from "@/lib/safe-redirect";
import { createRequestSupabaseClient } from "@/lib/supabase/request-client";

function readCredentials(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return request.json() as Promise<{
      email?: string;
      password?: string;
      redirect?: string;
    }>;
  }

  return request.formData().then((formData) => ({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    redirect: String(formData.get("redirect") ?? DEFAULT_APP_PATH),
  }));
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 },
    );
  }

  let body: { email?: string; password?: string; redirect?: string };
  try {
    body = await readCredentials(request);
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const redirectTo = String(body.redirect ?? DEFAULT_APP_PATH);
  const destination =
    redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : DEFAULT_APP_PATH;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const { supabase, applyCookiesToResponse } =
    createRequestSupabaseClient(request);

  // Clear stale or rotated refresh tokens before issuing a new session.
  await supabase.auth.signOut();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", error.message);
    loginUrl.searchParams.set("redirect", destination);
    return NextResponse.redirect(loginUrl, 303);
  }

  return applyCookiesToResponse(
    NextResponse.redirect(new URL(destination, request.url), 303),
  );
}

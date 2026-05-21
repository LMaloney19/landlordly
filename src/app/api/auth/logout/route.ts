import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createRequestSupabaseClient } from "@/lib/supabase/request-client";

async function signOut(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return { response: NextResponse.json({ ok: true }) };
  }

  const { supabase, applyCookiesToResponse } =
    createRequestSupabaseClient(request);

  await supabase.auth.signOut();

  return {
    response: applyCookiesToResponse(NextResponse.json({ ok: true })),
  };
}

export async function POST(request: NextRequest) {
  const { response } = await signOut(request);
  return response;
}

/** Lets you sign out from the browser address bar: /api/auth/logout */
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { supabase, applyCookiesToResponse } =
    createRequestSupabaseClient(request);

  await supabase.auth.signOut();

  return applyCookiesToResponse(
    NextResponse.redirect(new URL("/login", request.url)),
  );
}

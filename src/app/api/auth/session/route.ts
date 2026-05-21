import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getRequestUser } from "@/lib/supabase/request-auth";
import { createRequestSupabaseClient } from "@/lib/supabase/request-client";

/** Returns current session from cookies (does not refresh tokens). */
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const { supabase, applyCookiesToResponse } =
    createRequestSupabaseClient(request);

  const user = await getRequestUser(supabase);

  if (!user) {
    return applyCookiesToResponse(
      NextResponse.json({ ok: false }, { status: 401 }),
    );
  }

  return applyCookiesToResponse(
    NextResponse.json({ ok: true, email: user.email }),
  );
}

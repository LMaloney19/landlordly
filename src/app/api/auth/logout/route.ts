import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createRequestSupabaseClient } from "@/lib/supabase/request-client";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true });
  }

  const { supabase, applyCookiesToResponse } =
    createRequestSupabaseClient(request);

  await supabase.auth.signOut();

  return applyCookiesToResponse(NextResponse.json({ ok: true }));
}

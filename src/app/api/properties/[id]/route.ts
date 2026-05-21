import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getRequestUser } from "@/lib/supabase/request-auth";
import { createRequestSupabaseClient } from "@/lib/supabase/request-client";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 },
    );
  }

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Property id is required." }, { status: 400 });
  }

  const { supabase, applyCookiesToResponse } =
    createRequestSupabaseClient(request);

  const user = await getRequestUser(supabase);

  if (!user) {
    return applyCookiesToResponse(
      NextResponse.json({ error: "Not authenticated." }, { status: 401 }),
    );
  }

  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return applyCookiesToResponse(NextResponse.json({ ok: true }));
}

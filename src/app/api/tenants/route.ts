import { NextResponse, type NextRequest } from "next/server";
import type { TenantInput } from "@/app/actions/tenants";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { PROPERTY_ADDRESS_SELECT } from "@/lib/properties";
import { rowToTenant, type TenantRow } from "@/lib/tenants";
import { getRequestUser } from "@/lib/supabase/request-auth";
import { createRequestSupabaseClient } from "@/lib/supabase/request-client";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 },
    );
  }

  const { supabase, applyCookiesToResponse } =
    createRequestSupabaseClient(request);

  const user = await getRequestUser(supabase);

  if (!user) {
    return applyCookiesToResponse(
      NextResponse.json({ error: "Not authenticated." }, { status: 401 }),
    );
  }

  let body: { tenants?: TenantInput[] };
  try {
    body = (await request.json()) as { tenants?: TenantInput[] };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const inputs = body.tenants ?? [];
  if (inputs.length === 0) {
    return NextResponse.json(
      { error: "Add at least one tenant." },
      { status: 400 },
    );
  }

  const payloads = inputs.map((input) => ({
    user_id: user.id,
    property_id: input.propertyId,
    name: input.name.trim(),
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    unit_label: input.unitLabel?.trim() || null,
    lease_start: input.leaseStart || null,
    lease_end: input.leaseEnd,
    monthly_rent: input.monthlyRent ?? null,
  }));

  const { data, error } = await supabase
    .from("tenants")
    .insert(payloads)
    .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`);

  if (error) {
    const message = error.message.includes("relation")
      ? "Tenants table not found. Run supabase/migrations/20250515200000_tenants.sql in the SQL Editor."
      : error.message.includes("row-level security")
        ? "Could not save tenant. Sign out and sign in again, then retry."
        : error.message;

    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!data?.length) {
    return NextResponse.json(
      { error: "Tenants could not be saved." },
      { status: 500 },
    );
  }

  return applyCookiesToResponse(
    NextResponse.json({
      tenants: (data as TenantRow[]).map(rowToTenant),
    }),
  );
}

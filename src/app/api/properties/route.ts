import { NextResponse, type NextRequest } from "next/server";
import {
  PROPERTY_WITH_UNITS_SELECT,
  rowToProperty,
  type PropertyRow,
} from "@/lib/properties";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getRequestUser } from "@/lib/supabase/request-auth";
import { createRequestSupabaseClient } from "@/lib/supabase/request-client";
import type { CreatePropertyWithUnitsInput } from "@/app/actions/properties";

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

  let input: CreatePropertyWithUnitsInput;
  try {
    input = (await request.json()) as CreatePropertyWithUnitsInput;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .insert({
      user_id: user.id,
      address_line1: input.addressLine1.trim(),
      address_line2: null,
      city: input.city.trim(),
      state: input.state,
      postal_code: input.postalCode.trim(),
      country: input.country.trim() || "US",
    })
    .select()
    .single();

  if (propertyError) {
    return NextResponse.json({ error: propertyError.message }, { status: 400 });
  }

  const { error: unitsError } = await supabase.from("property_units").insert(
    input.units.map((unit) => ({
      user_id: user.id,
      property_id: property.id,
      unit_label: unit.label,
      bedrooms: unit.bedrooms,
      monthly_rent: unit.rent,
    })),
  );

  if (unitsError) {
    await supabase.from("properties").delete().eq("id", property.id);
    return NextResponse.json(
      {
        error: unitsError.message.includes("property_units")
          ? "Units table not found. Run supabase/migrations/20250515600000_property_units.sql"
          : unitsError.message,
      },
      { status: 400 },
    );
  }

  const { data: fullProperty, error: fetchError } = await supabase
    .from("properties")
    .select(PROPERTY_WITH_UNITS_SELECT)
    .eq("id", property.id)
    .single();

  if (fetchError || !fullProperty) {
    return NextResponse.json(
      { error: fetchError?.message ?? "Property saved but could not reload." },
      { status: 500 },
    );
  }

  return applyCookiesToResponse(
    NextResponse.json({
      property: rowToProperty(fullProperty as PropertyRow),
    }),
  );
}

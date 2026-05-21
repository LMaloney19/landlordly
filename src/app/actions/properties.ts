"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/supabase/get-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { PROPERTY_WITH_UNITS_SELECT, rowToProperty, type PropertyRow } from "@/lib/properties";
import type { Property, PropertyAddressInput } from "@/types";

export type PropertyUnitInput = {
  label: string;
  rent: number;
  bedrooms: number;
};

export type CreatePropertyWithUnitsInput = {
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  units: PropertyUnitInput[];
};

export type PropertyInput = PropertyAddressInput & {
  units: number;
  monthlyRent: number;
};

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getProperties(): Promise<ActionResult<Property[]>> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "Supabase is not configured. Add keys to .env.local.",
    };
  }

  const supabase = await createClient();
  const user = await getServerUser(supabase);

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTY_WITH_UNITS_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: (data as PropertyRow[]).map(rowToProperty),
  };
}

export async function createProperty(
  input: PropertyInput,
): Promise<ActionResult<Property>> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "Supabase is not configured. Add keys to .env.local.",
    };
  }

  const supabase = await createClient();
  const user = await getServerUser(supabase);

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { data, error } = await supabase
    .from("properties")
    .insert({
      user_id: user.id,
      address_line1: input.addressLine1.trim(),
      address_line2: input.addressLine2?.trim() || null,
      city: input.city.trim(),
      state: input.state,
      postal_code: input.postalCode.trim(),
      country: input.country?.trim() || "US",
      units: input.units,
      monthly_rent: input.monthlyRent,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: rowToProperty(data as PropertyRow) };
}

export async function createPropertyWithUnits(
  input: CreatePropertyWithUnitsInput,
): Promise<ActionResult<Property>> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "Supabase is not configured. Add keys to .env.local.",
    };
  }

  const supabase = await createClient();
  const user = await getServerUser(supabase);

  if (!user) {
    return { success: false, error: "Not authenticated." };
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
    return { success: false, error: propertyError.message };
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
    return {
      success: false,
      error: unitsError.message.includes("property_units")
        ? "Units table not found. Run supabase/migrations/20250515600000_property_units.sql"
        : unitsError.message,
    };
  }

  const { data: fullProperty, error: fetchError } = await supabase
    .from("properties")
    .select(PROPERTY_WITH_UNITS_SELECT)
    .eq("id", property.id)
    .single();

  if (fetchError || !fullProperty) {
    return {
      success: false,
      error: fetchError?.message ?? "Property saved but could not reload.",
    };
  }

  revalidatePath("/properties");
  return { success: true, data: rowToProperty(fullProperty as PropertyRow) };
}

export async function deleteProperty(id: string): Promise<ActionResult<null>> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "Supabase is not configured. Add keys to .env.local.",
    };
  }

  const supabase = await createClient();
  const user = await getServerUser(supabase);

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/properties");
  revalidatePath("/");
  return { success: true, data: null };
}

export async function updatePropertyWithUnits(
  id: string,
  input: CreatePropertyWithUnitsInput,
): Promise<ActionResult<Property>> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "Supabase is not configured. Add keys to .env.local.",
    };
  }

  const supabase = await createClient();
  const user = await getServerUser(supabase);

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { error: propertyError } = await supabase
    .from("properties")
    .update({
      address_line1: input.addressLine1.trim(),
      address_line2: null,
      city: input.city.trim(),
      state: input.state,
      postal_code: input.postalCode.trim(),
      country: input.country.trim() || "US",
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (propertyError) {
    return { success: false, error: propertyError.message };
  }

  const { error: deleteUnitsError } = await supabase
    .from("property_units")
    .delete()
    .eq("property_id", id);

  if (deleteUnitsError) {
    return { success: false, error: deleteUnitsError.message };
  }

  const { error: unitsError } = await supabase.from("property_units").insert(
    input.units.map((unit) => ({
      user_id: user.id,
      property_id: id,
      unit_label: unit.label,
      bedrooms: unit.bedrooms,
      monthly_rent: unit.rent,
    })),
  );

  if (unitsError) {
    return { success: false, error: unitsError.message };
  }

  const { data: fullProperty, error: fetchError } = await supabase
    .from("properties")
    .select(PROPERTY_WITH_UNITS_SELECT)
    .eq("id", id)
    .single();

  if (fetchError || !fullProperty) {
    return {
      success: false,
      error: fetchError?.message ?? "Property saved but could not reload.",
    };
  }

  revalidatePath("/properties");
  revalidatePath("/");
  return { success: true, data: rowToProperty(fullProperty as PropertyRow) };
}

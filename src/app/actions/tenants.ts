"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/supabase/get-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { PROPERTY_ADDRESS_SELECT } from "@/lib/properties";
import { addDaysIso, rowToTenant, todayIso, type TenantRow } from "@/lib/tenants";
import type { Tenant } from "@/types";
import type { ActionResult } from "@/app/actions/properties";

export type TenantInput = {
  propertyId: string;
  name: string;
  email?: string;
  phone?: string;
  unitLabel?: string;
  leaseStart?: string;
  leaseEnd: string;
  monthlyRent?: number;
};

const LEASE_EXPIRY_WINDOW_DAYS = 60;

export async function getTenants(): Promise<ActionResult<Tenant[]>> {
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
    .from("tenants")
    .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
    .order("lease_end", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: (data as TenantRow[]).map(rowToTenant),
  };
}

export async function getLeasesExpiringSoonCount(): Promise<
  ActionResult<number>
> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase is not configured." };
  }

  const supabase = await createClient();

  const user = await getServerUser(supabase);

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { count, error } = await supabase
    .from("tenants")
    .select("*", { count: "exact", head: true })
    .gte("lease_end", todayIso())
    .lte("lease_end", addDaysIso(LEASE_EXPIRY_WINDOW_DAYS));

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: count ?? 0 };
}

export async function createTenant(
  input: TenantInput,
): Promise<ActionResult<Tenant>> {
  const batch = await createTenants([input]);
  if (!batch.success) {
    return batch;
  }
  const first = batch.data[0];
  if (!first) {
    return { success: false, error: "Tenant was not created." };
  }
  return { success: true, data: first };
}

export async function createTenants(
  inputs: TenantInput[],
): Promise<ActionResult<Tenant[]>> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "Supabase is not configured. Add keys to .env.local.",
    };
  }

  if (inputs.length === 0) {
    return { success: false, error: "Add at least one tenant." };
  }

  const supabase = await createClient();

  const user = await getServerUser(supabase);

  if (!user) {
    return { success: false, error: "Not authenticated." };
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
    return { success: false, error: error.message };
  }

  if (!data?.length) {
    return { success: false, error: "Tenants could not be saved." };
  }

  const rows = data as TenantRow[];

  revalidatePath("/tenants");
  revalidatePath("/dashboard");

  return { success: true, data: rows.map(rowToTenant) };
}

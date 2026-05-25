"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/supabase/get-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { rowToMaintenance, type MaintenanceRow } from "@/lib/maintenance";
import { PROPERTY_ADDRESS_SELECT } from "@/lib/properties";
import type { MaintenanceRequest, MaintenanceStatus } from "@/types";
import type { ActionResult } from "@/app/actions/properties";

export type MaintenanceInput = {
  propertyId: string;
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
};

const OPEN_STATUSES: MaintenanceStatus[] = ["open", "in_progress"];

export async function getMaintenanceRequests(): Promise<
  ActionResult<MaintenanceRequest[]>
> {
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
    .from("maintenance_requests")
    .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: (data as MaintenanceRow[]).map(rowToMaintenance),
  };
}

export async function createMaintenanceRequest(
  input: MaintenanceInput,
): Promise<ActionResult<MaintenanceRequest>> {
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
    .from("maintenance_requests")
    .insert({
      user_id: user.id,
      property_id: input.propertyId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      priority: input.priority ?? "medium",
      status: "open",
    })
    .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/maintenance");
  revalidatePath("/properties");
  revalidatePath("/dashboard");

  return { success: true, data: rowToMaintenance(data as MaintenanceRow) };
}

export async function updateMaintenanceStatus(
  id: string,
  status: MaintenanceStatus,
): Promise<ActionResult<MaintenanceRequest>> {
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
    .from("maintenance_requests")
    .update({
      status,
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/maintenance");
  revalidatePath("/properties");
  revalidatePath("/dashboard");

  return { success: true, data: rowToMaintenance(data as MaintenanceRow) };
}

export async function getOpenMaintenanceCount(): Promise<ActionResult<number>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase is not configured." };
  }

  const supabase = await createClient();

  const user = await getServerUser(supabase);

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { count, error } = await supabase
    .from("maintenance_requests")
    .select("*", { count: "exact", head: true })
    .in("status", OPEN_STATUSES);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: count ?? 0 };
}

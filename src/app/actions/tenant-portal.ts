"use server";

import { revalidatePath } from "next/cache";
import { getAppUrl } from "@/lib/app-url";
import { rowToMaintenance, type MaintenanceRow } from "@/lib/maintenance";
import { PROPERTY_ADDRESS_SELECT } from "@/lib/properties";
import { rowToRentPayment, type RentPaymentRow } from "@/lib/rent-payments";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/supabase/get-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  inviteExpiresAt,
  rowToPortalTenant,
  TENANT_SELECT_PORTAL,
  type TenantRowWithPortal,
} from "@/lib/tenant-portal";
import type { ActionResult } from "@/app/actions/properties";
import type { MaintenanceRequest, RentPayment } from "@/types";

export type PortalTenant = ReturnType<typeof rowToPortalTenant>;

export type PortalHomeData = {
  tenant: PortalTenant;
  openMaintenance: MaintenanceRequest[];
  recentPayments: RentPayment[];
};

async function getLinkedTenant() {
  const supabase = await createClient();
  const user = await getServerUser(supabase);
  if (!user) {
    return { error: "Not authenticated." as const, supabase, user: null, tenant: null };
  }

  const { data, error } = await supabase
    .from("tenants")
    .select(TENANT_SELECT_PORTAL)
    .eq("portal_auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    return { error: error.message, supabase, user, tenant: null };
  }

  if (!data) {
    return {
      error: "No tenant portal account is linked to this login.",
      supabase,
      user,
      tenant: null,
    };
  }

  return {
    error: null,
    supabase,
    user,
    tenant: rowToPortalTenant(data as TenantRowWithPortal),
  };
}

export async function getPortalHomeData(): Promise<ActionResult<PortalHomeData>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase is not configured." };
  }

  const linked = await getLinkedTenant();
  if (linked.error || !linked.tenant) {
    return { success: false, error: linked.error ?? "Not linked." };
  }

  const { supabase, tenant } = linked;

  const [maintenanceResult, paymentsResult] = await Promise.all([
    supabase
      .from("maintenance_requests")
      .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
      .eq("tenant_id", tenant.id)
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false }),
    supabase
      .from("rent_payments")
      .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
      .eq("tenant_id", tenant.id)
      .order("paid_at", { ascending: false })
      .limit(6),
  ]);

  if (maintenanceResult.error) {
    return { success: false, error: maintenanceResult.error.message };
  }

  if (paymentsResult.error) {
    return { success: false, error: paymentsResult.error.message };
  }

  return {
    success: true,
    data: {
      tenant,
      openMaintenance: (maintenanceResult.data as MaintenanceRow[]).map(
        rowToMaintenance,
      ),
      recentPayments: (paymentsResult.data as RentPaymentRow[]).map(
        rowToRentPayment,
      ),
    },
  };
}

export async function acceptTenantPortalInvite(
  token: string,
): Promise<ActionResult<PortalTenant>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase is not configured." };
  }

  const trimmed = token.trim();
  if (!trimmed) {
    return { success: false, error: "Invite link is invalid." };
  }

  const supabase = await createClient();
  const user = await getServerUser(supabase);
  if (!user) {
    return { success: false, error: "Sign in first, then open your invite link again." };
  }

  const { data: invite, error: inviteError } = await supabase
    .from("tenant_portal_invites")
    .select("id, tenant_id, expires_at, accepted_at")
    .eq("token", trimmed)
    .maybeSingle();

  if (inviteError) {
    return {
      success: false,
      error: inviteError.message.includes("tenant_portal_invites")
        ? "Run supabase/migrations/20250516090000_tenant_portal.sql in Supabase."
        : inviteError.message,
    };
  }

  if (!invite) {
    return { success: false, error: "Invite not found or already used." };
  }

  if (invite.accepted_at) {
    return { success: false, error: "This invite was already accepted." };
  }

  if (new Date(invite.expires_at) < new Date()) {
    return {
      success: false,
      error: "This invite has expired. Ask your landlord for a new link.",
    };
  }

  const { data: tenantBeforeLink, error: tenantReadError } = await supabase
    .from("tenants")
    .select(TENANT_SELECT_PORTAL)
    .eq("id", invite.tenant_id)
    .maybeSingle();

  if (tenantReadError) {
    return { success: false, error: tenantReadError.message };
  }

  if (!tenantBeforeLink) {
    return { success: false, error: "Tenant record not found." };
  }

  const row = tenantBeforeLink as TenantRowWithPortal;

  if (row.portal_auth_user_id && row.portal_auth_user_id !== user.id) {
    return {
      success: false,
      error: "This tenant is already linked to another portal account.",
    };
  }

  if (row.portal_auth_user_id === user.id) {
    const { error: inviteUpdateError } = await supabase
      .from("tenant_portal_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    if (inviteUpdateError) {
      return { success: false, error: inviteUpdateError.message };
    }

    revalidatePath("/portal");
    revalidatePath("/tenants");
    return { success: true, data: rowToPortalTenant(row) };
  }

  const tenantEmail = row.email?.trim().toLowerCase();
  const userEmail = user.email?.trim().toLowerCase();
  if (tenantEmail && userEmail && tenantEmail !== userEmail) {
    return {
      success: false,
      error: `Sign in with ${row.email} — that is the email your landlord has on file for this tenant.`,
    };
  }

  const { data: tenantRow, error: tenantError } = await supabase
    .from("tenants")
    .update({
      portal_auth_user_id: user.id,
      portal_linked_at: new Date().toISOString(),
    })
    .eq("id", invite.tenant_id)
    .select(TENANT_SELECT_PORTAL)
    .single();

  if (tenantError || !tenantRow) {
    return { success: false, error: tenantError?.message ?? "Could not link account." };
  }

  const { error: inviteUpdateError } = await supabase
    .from("tenant_portal_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  if (inviteUpdateError) {
    return { success: false, error: inviteUpdateError.message };
  }

  revalidatePath("/portal");
  revalidatePath("/tenants");

  return { success: true, data: rowToPortalTenant(tenantRow as TenantRowWithPortal) };
}

export async function createTenantPortalInvite(
  tenantId: string,
): Promise<ActionResult<{ url: string; expiresAt: string }>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase is not configured." };
  }

  const supabase = await createClient();
  const user = await getServerUser(supabase);
  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, email")
    .eq("id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (tenantError) {
    return { success: false, error: tenantError.message };
  }

  if (!tenant) {
    return { success: false, error: "Tenant not found." };
  }

  if (!tenant.email?.trim()) {
    return {
      success: false,
      error: "Add the tenant's email before sending a portal invite.",
    };
  }

  const token = crypto.randomUUID().replace(/-/g, "");
  const expiresAt = inviteExpiresAt();

  await supabase.from("tenant_portal_invites").delete().eq("tenant_id", tenantId);

  const { error: insertError } = await supabase.from("tenant_portal_invites").insert({
    tenant_id: tenantId,
    landlord_user_id: user.id,
    token,
    expires_at: expiresAt,
  });

  if (insertError) {
    return {
      success: false,
      error: insertError.message.includes("tenant_portal_invites")
        ? "Run supabase/migrations/20250516090000_tenant_portal.sql in Supabase."
        : insertError.message,
    };
  }

  const url = `${getAppUrl()}/portal/accept?token=${token}`;

  return { success: true, data: { url, expiresAt } };
}

export async function submitPortalMaintenanceRequest(input: {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
}): Promise<ActionResult<MaintenanceRequest>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase is not configured." };
  }

  const title = input.title.trim();
  if (!title) {
    return { success: false, error: "Describe the issue." };
  }

  const linked = await getLinkedTenant();
  if (linked.error || !linked.tenant) {
    return { success: false, error: linked.error ?? "Not linked." };
  }

  const { supabase, tenant } = linked;

  const { data, error } = await supabase
    .from("maintenance_requests")
    .insert({
      user_id: tenant.landlordUserId,
      property_id: tenant.propertyId,
      tenant_id: tenant.id,
      unit_label: tenant.unitLabel,
      title,
      description: input.description?.trim() || null,
      priority: input.priority ?? "medium",
      status: "open",
    })
    .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Request could not be submitted." };
  }

  revalidatePath("/portal");
  revalidatePath("/maintenance");
  revalidatePath("/dashboard");

  return { success: true, data: rowToMaintenance(data as MaintenanceRow) };
}

export async function reportPortalRentPayment(input: {
  amount: number;
  paidAt: string;
  notes?: string;
}): Promise<ActionResult<RentPayment>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase is not configured." };
  }

  if (!input.paidAt) {
    return { success: false, error: "Payment date is required." };
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { success: false, error: "Amount must be greater than 0." };
  }

  const linked = await getLinkedTenant();
  if (linked.error || !linked.tenant) {
    return { success: false, error: linked.error ?? "Not linked." };
  }

  const { supabase, tenant } = linked;

  const { data, error } = await supabase
    .from("rent_payments")
    .insert({
      user_id: tenant.landlordUserId,
      property_id: tenant.propertyId,
      tenant_id: tenant.id,
      unit_label: tenant.unitLabel,
      amount: input.amount,
      paid_at: input.paidAt,
      notes: input.notes?.trim() || "Reported by tenant via portal",
      source: "tenant_portal",
    })
    .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Payment could not be recorded." };
  }

  revalidatePath("/portal");
  revalidatePath("/rent");
  revalidatePath("/dashboard");
  revalidatePath("/tenants");

  return { success: true, data: rowToRentPayment(data as RentPaymentRow) };
}

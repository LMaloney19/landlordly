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

export type TenantPortalAccessState = "not_enabled" | "pending" | "active";

export type TenantPortalAccessStatus = {
  state: TenantPortalAccessState;
  accessUrl: string | null;
  expiresAt: string | null;
  linkedAt: string | null;
  /** Another tenant uses the same email — portal logins must be separate. */
  emailConflictWith: string | null;
};

function portalAccessUrl(token: string) {
  return `${getAppUrl()}/portal/accept?token=${token}`;
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

async function findOtherTenantWithSameEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  landlordUserId: string,
  tenantId: string,
  email: string,
) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const { data, error } = await supabase
    .from("tenants")
    .select("id, name, email")
    .eq("user_id", landlordUserId)
    .neq("id", tenantId)
    .is("archived_at", null);

  if (error || !data) return null;

  return (
    data.find((row) => normalizeEmail(row.email) === normalized) ?? null
  );
}

export type PortalInvitePreview = {
  tenantId: string;
  tenantName: string;
  tenantEmail: string | null;
};

export async function getPortalInvitePreview(
  token: string,
): Promise<ActionResult<PortalInvitePreview>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase is not configured." };
  }

  const trimmed = token.trim();
  if (!trimmed) {
    return { success: false, error: "Portal access link is invalid." };
  }

  const supabase = await createClient();
  const { data: invite, error: inviteError } = await supabase
    .from("tenant_portal_invites")
    .select("tenant_id, expires_at, accepted_at")
    .eq("token", trimmed)
    .maybeSingle();

  if (inviteError || !invite) {
    return { success: false, error: "Portal access link not found." };
  }

  if (invite.accepted_at) {
    return { success: false, error: "This portal is already set up." };
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { success: false, error: "This access link has expired." };
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, name, email")
    .eq("id", invite.tenant_id)
    .maybeSingle();

  if (tenantError || !tenant) {
    return { success: false, error: "Tenant record not found." };
  }

  return {
    success: true,
    data: {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantEmail: tenant.email,
    },
  };
}

export async function getCurrentPortalTenantName(): Promise<
  ActionResult<{ tenantId: string; tenantName: string } | null>
> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase is not configured." };
  }

  const supabase = await createClient();
  const user = await getServerUser(supabase);
  if (!user) {
    return { success: true, data: null };
  }

  const { data, error } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("portal_auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data) {
    return { success: true, data: null };
  }

  return {
    success: true,
    data: { tenantId: data.id, tenantName: data.name },
  };
}

async function getLandlordTenant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  userId: string,
) {
  return supabase
    .from("tenants")
    .select("id, email, portal_auth_user_id, portal_linked_at")
    .eq("id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();
}

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
    return { success: false, error: "Portal access link is invalid." };
  }

  const supabase = await createClient();
  const user = await getServerUser(supabase);
  if (!user) {
    return {
      success: false,
      error: "Sign in first, then open your portal access link again.",
    };
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
    return {
      success: false,
      error:
        "Portal access link not found. Ask your landlord to copy the link from your tenant profile.",
    };
  }

  if (invite.accepted_at) {
    return {
      success: false,
      error: "This portal is already set up. Sign in at /portal with your account.",
    };
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return {
      success: false,
      error:
        "This access link has expired. Ask your landlord to reset portal access and send a new link.",
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

  if (user.id === row.user_id) {
    return {
      success: false,
      error: `This link is for tenant ${row.name}. You are signed in as the landlord — sign out, then have ${row.name} open the link with their own account (or use incognito).`,
    };
  }

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

  const { data: existingPortalTenant, error: existingLinkError } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("portal_auth_user_id", user.id)
    .neq("id", invite.tenant_id)
    .maybeSingle();

  if (existingLinkError) {
    return { success: false, error: existingLinkError.message };
  }

  if (existingPortalTenant) {
    return {
      success: false,
      error: `This login is already linked to ${existingPortalTenant.name}'s portal. To set up ${row.name}, sign out, then sign in with ${row.email ?? "the email on this tenant record"} (or create a new account).`,
    };
  }

  const emailConflict = await findOtherTenantWithSameEmail(
    supabase,
    row.user_id,
    row.id,
    row.email ?? "",
  );
  if (emailConflict) {
    return {
      success: false,
      error: `${row.name} shares the same email as ${emailConflict.name}. Each tenant needs a unique email for portal access — update the email on the tenant profile first.`,
    };
  }

  const tenantEmail = normalizeEmail(row.email);
  const userEmail = normalizeEmail(user.email);
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
    const message = tenantError?.message ?? "Could not link account.";
    if (message.includes("tenants_portal_auth_user_id_uniq")) {
      return {
        success: false,
        error:
          "This login is already linked to another tenant. Use a different email or account for this tenant.",
      };
    }
    return { success: false, error: message };
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

export async function getTenantPortalAccessStatus(
  tenantId: string,
): Promise<ActionResult<TenantPortalAccessStatus>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase is not configured." };
  }

  const supabase = await createClient();
  const user = await getServerUser(supabase);
  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { data: tenant, error: tenantError } = await getLandlordTenant(
    supabase,
    tenantId,
    user.id,
  );

  if (tenantError) {
    return { success: false, error: tenantError.message };
  }

  if (!tenant) {
    return { success: false, error: "Tenant not found." };
  }

  let emailConflictWith: string | null = null;
  if (tenant.email?.trim()) {
    const conflict = await findOtherTenantWithSameEmail(
      supabase,
      user.id,
      tenantId,
      tenant.email,
    );
    if (conflict) {
      emailConflictWith = conflict.name;
    }
  }

  if (tenant.portal_auth_user_id) {
    return {
      success: true,
      data: {
        state: "active",
        accessUrl: null,
        expiresAt: null,
        linkedAt: tenant.portal_linked_at ?? null,
        emailConflictWith,
      },
    };
  }

  if (!tenant.email?.trim()) {
    return {
      success: true,
      data: {
        state: "not_enabled",
        accessUrl: null,
        expiresAt: null,
        linkedAt: null,
        emailConflictWith: null,
      },
    };
  }

  const { data: pendingInvite, error: inviteError } = await supabase
    .from("tenant_portal_invites")
    .select("token, expires_at")
    .eq("tenant_id", tenantId)
    .is("accepted_at", null)
    .maybeSingle();

  if (inviteError) {
    return {
      success: false,
      error: inviteError.message.includes("tenant_portal_invites")
        ? "Run supabase/migrations/20250516090000_tenant_portal.sql in Supabase."
        : inviteError.message,
    };
  }

  if (pendingInvite) {
    return {
      success: true,
      data: {
        state: "pending",
        accessUrl: portalAccessUrl(pendingInvite.token),
        expiresAt: pendingInvite.expires_at,
        linkedAt: null,
        emailConflictWith,
      },
    };
  }

  return {
    success: true,
    data: {
      state: "not_enabled",
      accessUrl: null,
      expiresAt: null,
      linkedAt: null,
      emailConflictWith,
    },
  };
}

export async function resetTenantPortalAccess(
  tenantId: string,
): Promise<ActionResult<void>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase is not configured." };
  }

  const supabase = await createClient();
  const user = await getServerUser(supabase);
  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { data: tenant, error: tenantError } = await getLandlordTenant(
    supabase,
    tenantId,
    user.id,
  );

  if (tenantError) {
    return { success: false, error: tenantError.message };
  }

  if (!tenant) {
    return { success: false, error: "Tenant not found." };
  }

  const { error: inviteDeleteError } = await supabase
    .from("tenant_portal_invites")
    .delete()
    .eq("tenant_id", tenantId);

  if (inviteDeleteError) {
    return { success: false, error: inviteDeleteError.message };
  }

  const { error: unlinkError } = await supabase
    .from("tenants")
    .update({
      portal_auth_user_id: null,
      portal_linked_at: null,
    })
    .eq("id", tenantId)
    .eq("user_id", user.id);

  if (unlinkError) {
    return { success: false, error: unlinkError.message };
  }

  revalidatePath("/tenants");
  revalidatePath("/portal");

  return { success: true, data: undefined };
}

export async function createTenantPortalInvite(
  tenantId: string,
): Promise<ActionResult<{ url: string; expiresAt: string | null }>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase is not configured." };
  }

  const supabase = await createClient();
  const user = await getServerUser(supabase);
  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { data: tenant, error: tenantError } = await getLandlordTenant(
    supabase,
    tenantId,
    user.id,
  );

  if (tenantError) {
    return { success: false, error: tenantError.message };
  }

  if (!tenant) {
    return { success: false, error: "Tenant not found." };
  }

  if (tenant.portal_auth_user_id) {
    return {
      success: false,
      error: "Portal is already active for this tenant. They sign in at /portal.",
    };
  }

  if (!tenant.email?.trim()) {
    return {
      success: false,
      error: "Add the tenant's email before enabling portal access.",
    };
  }

  const emailConflict = await findOtherTenantWithSameEmail(
    supabase,
    user.id,
    tenantId,
    tenant.email,
  );
  if (emailConflict) {
    return {
      success: false,
      error: `This email is also on ${emailConflict.name}. Each tenant needs their own email for an independent portal — change one of the emails first.`,
    };
  }

  const { data: pendingInvite, error: pendingError } = await supabase
    .from("tenant_portal_invites")
    .select("id, token, expires_at")
    .eq("tenant_id", tenantId)
    .is("accepted_at", null)
    .maybeSingle();

  if (pendingError) {
    return {
      success: false,
      error: pendingError.message.includes("tenant_portal_invites")
        ? "Run supabase/migrations/20250516110000_tenant_portal_stable_access.sql in Supabase."
        : pendingError.message,
    };
  }

  if (pendingInvite) {
    return {
      success: true,
      data: {
        url: portalAccessUrl(pendingInvite.token),
        expiresAt: pendingInvite.expires_at,
      },
    };
  }

  const token = crypto.randomUUID().replace(/-/g, "");

  const { error: insertError } = await supabase.from("tenant_portal_invites").insert({
    tenant_id: tenantId,
    landlord_user_id: user.id,
    token,
    expires_at: null,
  });

  if (insertError) {
    return {
      success: false,
      error: insertError.message.includes("tenant_portal_invites")
        ? "Run supabase/migrations/20250516110000_tenant_portal_stable_access.sql in Supabase."
        : insertError.message,
    };
  }

  return {
    success: true,
    data: {
      url: portalAccessUrl(token),
      expiresAt: null,
    },
  };
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

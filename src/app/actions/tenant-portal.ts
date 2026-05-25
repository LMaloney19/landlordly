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

type PortalInviteByTokenRow = {
  invite_id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_email: string | null;
  landlord_user_id: string;
  expires_at: string | null;
  accepted_at: string | null;
};

const PORTAL_INVITE_RPC_MIGRATION =
  "Run supabase/migrations/20250516210000_portal_invite_by_token_rpc.sql in Supabase.";

const PORTAL_ACCEPT_RPC_MIGRATION =
  "Run supabase/migrations/20250516220000_portal_accept_invite_rpc.sql in Supabase.";

type AcceptInviteRpcResult = {
  ok: boolean;
  code?: string;
  tenant_id?: string;
  tenant_name?: string;
  tenant_email?: string;
  other_name?: string;
};

function mapAcceptInviteRpcError(result: AcceptInviteRpcResult): string {
  switch (result.code) {
    case "not_authenticated":
      return "Sign in first, then open your portal access link again.";
    case "not_found":
      return PORTAL_INVITE_NOT_FOUND;
    case "already_accepted":
      return "This portal is already set up. Sign in at /portal with your account.";
    case "expired":
      return "This access link has expired. Ask your landlord to reset portal access and send a new link.";
    case "landlord_account":
      return `This link is for tenant ${result.tenant_name ?? "this tenant"}. You are signed in as the landlord — sign out, then have them open the link with their own account (or use incognito).`;
    case "tenant_other_account":
      return "This tenant is already linked to another portal account.";
    case "user_linked_other":
      return `This login is already linked to ${result.other_name}'s portal. To set up ${result.tenant_name ?? "this tenant"}, sign out, then sign in with ${result.tenant_email ?? "the email on this tenant record"} (or create a new account).`;
    case "email_conflict":
      return `${result.tenant_name ?? "This tenant"} shares an email with another tenant on file. Each tenant needs a unique email — ask your landlord to update the tenant profile.`;
    case "email_mismatch":
      return `Sign in with ${result.tenant_email} — that is the email your landlord has on file for this tenant.`;
    default:
      return "Could not link portal account.";
  }
}

const PORTAL_INVITE_NOT_FOUND =
  "Portal access link not found or already used. Ask your landlord to copy a fresh link from the tenant profile (Enable portal access).";

async function fetchPortalInviteByToken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  token: string,
) {
  const { data, error } = await supabase.rpc("get_tenant_portal_invite_by_token", {
    p_token: token,
  });

  if (error) {
    const needsRpc = error.message.includes("get_tenant_portal_invite_by_token");
    return {
      invite: null as PortalInviteByTokenRow | null,
      error: needsRpc ? PORTAL_INVITE_RPC_MIGRATION : error.message,
    };
  }

  const rows = data as PortalInviteByTokenRow[] | null;
  const invite = rows?.[0] ?? null;
  return { invite, error: null as string | null };
}

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
  const { invite, error } = await fetchPortalInviteByToken(supabase, trimmed);

  if (error) {
    return { success: false, error };
  }

  if (!invite) {
    return { success: false, error: PORTAL_INVITE_NOT_FOUND };
  }

  return {
    success: true,
    data: {
      tenantId: invite.tenant_id,
      tenantName: invite.tenant_name,
      tenantEmail: invite.tenant_email,
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

  const { data: acceptData, error: acceptError } = await supabase.rpc(
    "accept_tenant_portal_invite_by_token",
    { p_token: trimmed },
  );

  if (acceptError) {
    return {
      success: false,
      error: acceptError.message.includes("accept_tenant_portal_invite_by_token")
        ? PORTAL_ACCEPT_RPC_MIGRATION
        : acceptError.message,
    };
  }

  const acceptResult = acceptData as AcceptInviteRpcResult;
  if (!acceptResult?.ok) {
    return { success: false, error: mapAcceptInviteRpcError(acceptResult) };
  }

  const tenantId = acceptResult.tenant_id;
  if (!tenantId) {
    return { success: false, error: "Could not link portal account." };
  }

  const { data: tenantRow, error: tenantError } = await supabase
    .from("tenants")
    .select(TENANT_SELECT_PORTAL)
    .eq("id", tenantId)
    .single();

  if (tenantError || !tenantRow) {
    return { success: false, error: tenantError?.message ?? "Tenant record not found." };
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

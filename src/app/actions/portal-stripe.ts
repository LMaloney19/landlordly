"use server";

import { getAppUrl } from "@/lib/app-url";
import type { ActionResult } from "@/app/actions/properties";
import { getStripe, isStripeConfigured } from "@/lib/stripe/config";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/supabase/get-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  rowToPortalTenant,
  TENANT_SELECT_PORTAL,
  type TenantRowWithPortal,
} from "@/lib/tenant-portal";

async function getLinkedPortalTenant() {
  const supabase = await createClient();
  const user = await getServerUser(supabase);
  if (!user) {
    return { error: "Not authenticated." as const, user: null, tenant: null };
  }

  const { data, error } = await supabase
    .from("tenants")
    .select(TENANT_SELECT_PORTAL)
    .eq("portal_auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    return { error: error.message, user, tenant: null };
  }

  if (!data) {
    return {
      error: "No tenant portal account is linked to this login.",
      user,
      tenant: null,
    };
  }

  return {
    error: null,
    user,
    tenant: rowToPortalTenant(data as TenantRowWithPortal),
  };
}

export async function isPortalStripeEnabled(): Promise<boolean> {
  return isStripeConfigured();
}

export async function createPortalRentCheckoutSession(
  amount?: number,
): Promise<ActionResult<{ url: string }>> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase is not configured." };
  }

  if (!isStripeConfigured()) {
    return {
      success: false,
      error:
        "Online rent payment is not set up yet. Ask your landlord to configure Stripe in Vercel.",
    };
  }

  const linked = await getLinkedPortalTenant();
  if (linked.error || !linked.tenant) {
    return { success: false, error: linked.error ?? "Not linked." };
  }

  const tenant = linked.tenant;
  const resolvedAmount =
    amount != null && Number.isFinite(amount) && amount > 0
      ? amount
      : tenant.monthlyRent;

  if (!resolvedAmount || resolvedAmount <= 0) {
    return {
      success: false,
      error: "Rent amount is not set on your lease. Contact your landlord.",
    };
  }

  const amountCents = Math.round(resolvedAmount * 100);
  if (amountCents < 50) {
    return { success: false, error: "Amount must be at least $0.50." };
  }

  const appUrl = getAppUrl();
  const unitPart = tenant.unitLabel ? ` · Unit ${tenant.unitLabel}` : "";

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: "Rent payment",
              description: `${tenant.propertyAddress}${unitPart}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        tenant_id: tenant.id,
        landlord_user_id: tenant.landlordUserId,
        property_id: tenant.propertyId,
        unit_label: tenant.unitLabel ?? "",
        tenant_name: tenant.name,
      },
      success_url: `${appUrl}/portal?checkout=success`,
      cancel_url: `${appUrl}/portal?checkout=cancelled`,
    });

    if (!session.url) {
      return { success: false, error: "Could not start checkout." };
    }

    return { success: true, data: { url: session.url } };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Stripe checkout failed.";
    return { success: false, error: message };
  }
}

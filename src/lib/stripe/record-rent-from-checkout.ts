import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export type RecordRentFromCheckoutResult =
  | { ok: true; created: boolean; paymentId?: string }
  | { ok: false; error: string };

/** Idempotent: creates one rent_payments row per Stripe Checkout session. */
export async function recordRentFromCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<RecordRentFromCheckoutResult> {
  if (session.payment_status !== "paid") {
    return { ok: false, error: "Checkout session is not paid." };
  }

  const sessionId = session.id;
  if (!sessionId) {
    return { ok: false, error: "Missing checkout session id." };
  }

  const metadata = session.metadata ?? {};
  const tenantId = metadata.tenant_id?.trim();
  const landlordUserId = metadata.landlord_user_id?.trim();
  const propertyId = metadata.property_id?.trim();
  const unitLabel = metadata.unit_label?.trim() || null;

  if (!tenantId || !landlordUserId || !propertyId) {
    return { ok: false, error: "Checkout session metadata is incomplete." };
  }

  const amountTotal = session.amount_total;
  if (amountTotal == null || amountTotal <= 0) {
    return { ok: false, error: "Invalid payment amount." };
  }

  const amount = amountTotal / 100;
  const paidAt = new Date().toISOString().slice(0, 10);

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("rent_payments")
    .select("id")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (existing) {
    return { ok: true, created: false, paymentId: existing.id };
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const { data, error } = await supabase
    .from("rent_payments")
    .insert({
      user_id: landlordUserId,
      property_id: propertyId,
      tenant_id: tenantId,
      unit_label: unitLabel,
      amount,
      paid_at: paidAt,
      notes: "Paid online via tenant portal (Stripe)",
      source: "stripe",
      stripe_checkout_session_id: sessionId,
      stripe_payment_intent_id: paymentIntentId,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("rent_payments_stripe_checkout_session_id_uniq")) {
      return { ok: true, created: false };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, created: true, paymentId: data?.id };
}

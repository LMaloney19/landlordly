"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/supabase/get-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { PROPERTY_ADDRESS_SELECT } from "@/lib/properties";
import {
  endOfMonthIso,
  rowToRentPayment,
  startOfMonthIso,
  type RentPaymentRow,
} from "@/lib/rent-payments";
import type { RentPayment } from "@/types";
import type { ActionResult } from "@/app/actions/properties";

export type RentPaymentInput = {
  propertyId: string;
  amount: number;
  paidAt: string;
  notes?: string;
};

export async function getRentPayments(): Promise<ActionResult<RentPayment[]>> {
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
    .from("rent_payments")
    .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
    .order("paid_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: (data as RentPaymentRow[]).map(rowToRentPayment),
  };
}

export async function getRentCollectedThisMonth(): Promise<
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

  const { data, error } = await supabase
    .from("rent_payments")
    .select("amount")
    .gte("paid_at", startOfMonthIso())
    .lte("paid_at", endOfMonthIso());

  if (error) {
    return { success: false, error: error.message };
  }

  const total = (data ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0,
  );

  return { success: true, data: total };
}

export async function createRentPayment(
  input: RentPaymentInput,
): Promise<ActionResult<RentPayment>> {
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
    .from("rent_payments")
    .insert({
      user_id: user.id,
      property_id: input.propertyId,
      amount: input.amount,
      paid_at: input.paidAt,
      notes: input.notes?.trim() || null,
    })
    .select(`*, properties(${PROPERTY_ADDRESS_SELECT})`)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/rent");
  revalidatePath("/");

  return { success: true, data: rowToRentPayment(data as RentPaymentRow) };
}

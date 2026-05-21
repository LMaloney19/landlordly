"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/supabase/get-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { EXPENSE_RECEIPT_BUCKET } from "@/lib/expense-receipts";
import type { ActionResult } from "@/app/actions/properties";

export async function getExpenseReceiptUrl(
  filePath: string,
): Promise<ActionResult<string>> {
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

  const { data, error } = await supabase.storage
    .from(EXPENSE_RECEIPT_BUCKET)
    .createSignedUrl(filePath, 60 * 60);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data.signedUrl };
}

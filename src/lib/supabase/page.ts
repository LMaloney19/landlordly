import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getServerUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";

export const createPageClient = cache(async () => {
  if (!isSupabaseConfigured()) {
    return { configured: false as const };
  }

  const supabase = await createClient();
  const user = await getServerUser(supabase);

  return { configured: true as const, supabase, user };
});

import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export async function getBrowserUser(): Promise<User | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

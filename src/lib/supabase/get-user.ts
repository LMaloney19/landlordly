import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Reads the user from the session cookie without contacting Supabase Auth.
 * Mutations should use API routes instead of server actions.
 */
export async function getServerUser(
  supabase?: SupabaseClient,
): Promise<User | null> {
  const client = supabase ?? (await createClient());

  const {
    data: { session },
  } = await client.auth.getSession();

  return session?.user ?? null;
}

import type { SupabaseClient, User } from "@supabase/supabase-js";

/** Reads the authenticated user from cookies without triggering a token refresh. */
export async function getRequestUser(
  supabase: SupabaseClient,
): Promise<User | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user ?? null;
}

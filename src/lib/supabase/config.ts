/** Strip quotes/whitespace from Vercel env vars and remove accidental API path suffixes. */
export function getSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, "") ?? "";
  if (!raw) return "";

  try {
    const url = new URL(raw);
    // Must be project root only, e.g. https://abcdefgh.supabase.co
    return url.origin;
  } catch {
    return raw
      .replace(/\/auth\/v1\/?$/i, "")
      .replace(/\/rest\/v1\/?$/i, "")
      .replace(/\/$/, "");
  }
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim().replace(/^["']|["']$/g, "") ??
    ""
  );
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

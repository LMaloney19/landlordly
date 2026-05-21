/** Default post-login destination (dashboard app). */
export const DEFAULT_APP_PATH = "/dashboard";

/** Only allow same-site relative paths (blocks open redirects like `//evil.com`). */
export function safeRedirectPath(path: string | undefined | null): string {
  if (!path) return DEFAULT_APP_PATH;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return DEFAULT_APP_PATH;
  return trimmed;
}

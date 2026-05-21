/** Only allow same-site relative paths (blocks open redirects like `//evil.com`). */
export function safeRedirectPath(path: string | undefined | null): string {
  if (!path) return "/";
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";
  return trimmed;
}

/**
 * Route handlers / Server Components: read the session from cookies only.
 * Do not refresh here — avoids parallel refresh races with middleware.
 */
export const routeHandlerAuthOptions = {
  autoRefreshToken: false,
  detectSessionInUrl: false,
  persistSession: true,
} as const;

function isRefreshTokenError(message: string, code?: string): boolean {
  const m = message.toLowerCase();
  return (
    code === "refresh_token_already_used" ||
    m.includes("refresh token") ||
    m.includes("invalid refresh token")
  );
}

export { isRefreshTokenError };

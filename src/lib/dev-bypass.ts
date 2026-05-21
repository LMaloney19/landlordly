const DEV_BYPASS_KEY = "landlordly.devAuthBypass";

export function canUseDevBypass() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_VERCEL_ENV !== "production"
  );
}

export function hasDevBypass() {
  if (!canUseDevBypass() || typeof window === "undefined") return false;
  // Ignore stale flags if localStorage was set during local dev on the same browser.
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === "production") return false;
  return window.localStorage.getItem(DEV_BYPASS_KEY) === "true";
}

export function enableDevBypass() {
  if (!canUseDevBypass() || typeof window === "undefined") return;
  window.localStorage.setItem(DEV_BYPASS_KEY, "true");
}

export function disableDevBypass() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEV_BYPASS_KEY);
}

export function getDevTestCredentials() {
  const email = process.env.NEXT_PUBLIC_DEV_AUTH_EMAIL?.trim();
  const password = process.env.NEXT_PUBLIC_DEV_AUTH_PASSWORD ?? "";

  if (!email || !password) return null;
  return { email, password };
}

export function signedOutSaveMessage() {
  if (hasDevBypass()) {
    return "Dev mode is active. Sign in with Supabase or configure the dev test account to save real data.";
  }

  return "You are not signed in. Please sign in again.";
}

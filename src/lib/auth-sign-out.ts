"use client";

import { disableDevBypass } from "@/lib/dev-bypass";
import { createClient } from "@/lib/supabase/client";

/** Clears Supabase session, dev bypass flag, and server auth cookies. */
export async function signOutAndGoToLogin(loginPath = "/login") {
  disableDevBypass();
  const supabase = createClient();
  await supabase.auth.signOut();
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
  });
  window.location.assign(loginPath);
}

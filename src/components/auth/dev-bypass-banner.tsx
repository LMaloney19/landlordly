"use client";

import { useEffect, useState } from "react";
import { hasDevBypass } from "@/lib/dev-bypass";

export function DevBypassBanner() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(hasDevBypass());
  }, []);

  if (!enabled) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
      Dev mode is active. You can browse the app, but database saves require a
      real Supabase login or configured dev test account.
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { SidebarFooter } from "@/components/layout/sidebar-footer";
import { getBrowserUser } from "@/lib/supabase/browser-user";

type SidebarAccountFooterProps = {
  serverEmail?: string;
};

export function SidebarAccountFooter({ serverEmail }: SidebarAccountFooterProps) {
  const [clientEmail, setClientEmail] = useState<string | undefined>();

  useEffect(() => {
    if (serverEmail) return;

    let cancelled = false;

    void getBrowserUser().then((user) => {
      if (!cancelled) {
        setClientEmail(user?.email ?? undefined);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [serverEmail]);

  const email = serverEmail ?? clientEmail;

  return <SidebarFooter email={email} />;
}

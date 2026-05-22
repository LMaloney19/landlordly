import { PortalShell } from "@/components/portal/portal-shell";
import { createPageClient } from "@/lib/supabase/page";

export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const page = await createPageClient();
  const userEmail = page.configured ? page.user?.email : undefined;

  return <PortalShell userEmail={userEmail}>{children}</PortalShell>;
}

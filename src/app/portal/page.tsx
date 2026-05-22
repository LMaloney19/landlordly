import { redirect } from "next/navigation";
import { getPortalHomeData } from "@/app/actions/tenant-portal";
import { PortalHomeClient } from "@/components/portal/portal-home-client";
import { createPageClient } from "@/lib/supabase/page";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const page = await createPageClient();

  if (!page.configured) {
    return (
      <PortalHomeClient
        initial={null}
        initialError="Supabase is not configured."
        needsLink={false}
      />
    );
  }

  if (!page.user) {
    redirect("/login?redirect=%2Fportal");
  }

  const result = await getPortalHomeData();

  if (!result.success) {
    const needsLink = result.error.includes("linked");
    return (
      <PortalHomeClient
        initial={null}
        initialError={result.error}
        needsLink={needsLink}
      />
    );
  }

  return (
    <PortalHomeClient initial={result.data} initialError={null} needsLink={false} />
  );
}

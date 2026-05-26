import { redirect } from "next/navigation";
import { isPortalStripeEnabled } from "@/app/actions/portal-stripe";
import { getPortalHomeData } from "@/app/actions/tenant-portal";
import { PortalHomeClient } from "@/components/portal/portal-home-client";
import { createPageClient } from "@/lib/supabase/page";

export const dynamic = "force-dynamic";

type PortalPageProps = {
  searchParams: Promise<{ checkout?: string }>;
};

export default async function PortalPage({ searchParams }: PortalPageProps) {
  const { checkout } = await searchParams;
  const checkoutNotice =
    checkout === "success" ? "success" : checkout === "cancelled" ? "cancelled" : null;

  const stripeEnabled = await isPortalStripeEnabled();
  const page = await createPageClient();

  if (!page.configured) {
    return (
      <PortalHomeClient
        initial={null}
        initialError="Supabase is not configured."
        needsLink={false}
        stripeEnabled={false}
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
        stripeEnabled={stripeEnabled}
        checkoutNotice={checkoutNotice}
      />
    );
  }

  return (
    <PortalHomeClient
      initial={result.data}
      initialError={null}
      needsLink={false}
      stripeEnabled={stripeEnabled}
      checkoutNotice={checkoutNotice}
    />
  );
}

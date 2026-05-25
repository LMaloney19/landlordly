import { PortalAcceptClient } from "@/components/portal/portal-accept-client";

export const dynamic = "force-dynamic";

type PortalAcceptPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function PortalAcceptPage({ searchParams }: PortalAcceptPageProps) {
  const { token } = await searchParams;

  if (!token?.trim()) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
        Portal access link is incomplete. Ask your landlord to copy the link from your tenant
        profile.
      </p>
    );
  }

  return <PortalAcceptClient token={token.trim()} />;
}

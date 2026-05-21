import { TenantProfileClient } from "@/components/tenants/tenant-profile-client";

export const dynamic = "force-dynamic";

type TenantProfilePageProps = {
  params: Promise<{ id: string }>;
};

export default async function TenantProfilePage({
  params,
}: TenantProfilePageProps) {
  const { id } = await params;
  return <TenantProfileClient tenantId={id} />;
}

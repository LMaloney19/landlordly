import { getDashboardData, type DashboardData } from "@/app/actions/dashboard";
import { DashboardPageClient } from "@/components/dashboard/dashboard-page-client";

function emptyDashboardData(): DashboardData {
  return {
    stats: {
      totalUnits: 0,
      propertyCount: 0,
      expectedMonthlyRent: 0,
      rentCollectedThisMonth: 0,
      openMaintenanceRequests: 0,
      leasesExpiringSoon: 0,
    },
    recentProperties: [],
    recentPayments: [],
    expiringLeases: [],
    openMaintenance: [],
  };
}

export default async function DashboardPage() {
  const result = await getDashboardData();

  if (!result.success) {
    return <DashboardPageClient initialData={emptyDashboardData()} />;
  }

  return <DashboardPageClient initialData={result.data} />;
}

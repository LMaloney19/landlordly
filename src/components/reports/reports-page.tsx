import {
  Building2,
  DollarSign,
  Hammer,
  Receipt,
  Users,
} from "lucide-react";
import type { ReportData } from "@/app/actions/reports";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { ReportsExport } from "@/components/reports/reports-export";
import { ProfitLossReport } from "@/components/reports/profit-loss-report";
import { formatCurrency } from "@/lib/utils";

type ReportsPageProps = {
  data: ReportData;
};

export function ReportsPage({ data }: ReportsPageProps) {
  const collectionRate =
    data.expectedMonthlyRent > 0
      ? Math.round(
          (data.rentCollectedThisMonth / data.expectedMonthlyRent) * 100,
        )
      : null;

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Reports"
          description="Income summaries and portfolio metrics from your live data."
        />
        <ReportsExport data={data} />
      </div>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Rent collected (month)"
          value={formatCurrency(data.rentCollectedThisMonth)}
          subtitle={
            collectionRate != null
              ? `${collectionRate}% of expected rent`
              : "This month"
          }
          icon={DollarSign}
          accent="positive"
        />
        <StatCard
          title="Rent collected (YTD)"
          value={formatCurrency(data.rentCollectedYtd)}
          subtitle={`${data.totalPayments} payments recorded`}
          icon={Receipt}
          accent="positive"
        />
        <StatCard
          title="Expected monthly rent"
          value={formatCurrency(data.expectedMonthlyRent)}
          subtitle={`${data.totalUnits} units · ${data.propertyCount} properties`}
          icon={Building2}
        />
        <StatCard
          title="Active tenants"
          value={String(data.tenantCount)}
          subtitle="On record"
          icon={Users}
        />
        <StatCard
          title="Open maintenance"
          value={String(data.openMaintenance)}
          subtitle="Open or in progress"
          icon={Hammer}
          accent={data.openMaintenance > 0 ? "warning" : "default"}
        />
      </section>

      <section className="mt-8 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <header className="border-b border-zinc-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">
            Rent collected by month
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">Last 6 months</p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50 text-left">
                <th className="px-6 py-3 font-medium text-zinc-500">Month</th>
                <th className="px-6 py-3 text-right font-medium text-zinc-500">
                  Collected
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {data.rentByMonth.map((row) => (
                <tr key={row.month} className="hover:bg-zinc-50/50">
                  <td className="px-6 py-3 text-zinc-700">{row.label}</td>
                  <td className="px-6 py-3 text-right font-medium text-zinc-900">
                    {formatCurrency(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-200 bg-zinc-50/50">
                <td className="px-6 py-3 font-medium text-zinc-900">Total</td>
                <td className="px-6 py-3 text-right font-semibold text-zinc-900">
                  {formatCurrency(
                    data.rentByMonth.reduce((s, r) => s + r.total, 0),
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <ProfitLossReport />
    </>
  );
}

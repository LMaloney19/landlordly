import { getReportData } from "@/app/actions/reports";
import { ReportsPage } from "@/components/reports/reports-page";
import { PageHeader } from "@/components/ui/page-header";

export default async function ReportsRoute() {
  const result = await getReportData();

  if (!result.success) {
    return (
      <>
        <PageHeader
          title="Reports"
          description="Income summaries and portfolio metrics from your live data."
        />
        <p
          className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          role="alert"
        >
          {result.error}
        </p>
      </>
    );
  }

  return <ReportsPage data={result.data} />;
}

import type { RentPayment } from "@/types";
import { formatCurrency } from "@/lib/utils";

type RentPaymentListProps = {
  payments: RentPayment[];
};

function formatPaidDate(isoDate: string) {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RentPaymentList({ payments }: RentPaymentListProps) {
  if (payments.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center shadow-sm">
        <p className="text-sm font-medium text-zinc-900">No payments yet</p>
        <p className="mt-2 text-sm text-zinc-500">
          Record your first rent payment using the form.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <header className="border-b border-zinc-200 px-6 py-4">
        <h2 className="text-sm font-semibold text-zinc-900">Payment history</h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          {payments.length} {payments.length === 1 ? "payment" : "payments"}
        </p>
      </header>
      <ul className="divide-y divide-zinc-100">
        {payments.map((payment) => (
          <li
            key={payment.id}
            className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-zinc-50/80"
          >
            <section>
              <p className="text-sm font-medium text-zinc-900">
                {payment.propertyAddress}
              </p>
              <p className="mt-0.5 text-sm text-zinc-500">
                {formatPaidDate(payment.paidAt)}
                {payment.notes ? ` · ${payment.notes}` : ""}
              </p>
            </section>
            <p className="shrink-0 text-sm font-semibold text-emerald-600">
              +{formatCurrency(payment.amount)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

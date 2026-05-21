import Link from "next/link";
import { Check } from "lucide-react";

type LandingPricingProps = {
  isSignedIn: boolean;
};

const plans = [
  {
    name: "Early access",
    price: "Free",
    period: "while we launch",
    description: "Full app for independent landlords getting organized.",
    highlighted: true,
    cta: "Create free account",
    features: [
      "Unlimited properties & units",
      "Tenants, leases & rent tracking",
      "Expenses with categories",
      "Maintenance requests",
      "P&L reports & Schedule E export",
      "Your data in your Supabase project",
    ],
  },
  {
    name: "Pro",
    price: "$12",
    period: "per month · coming soon",
    description: "For growing portfolios that need more automation.",
    highlighted: false,
    cta: "Join waitlist",
    features: [
      "Everything in Early access",
      "Email rent reminders",
      "Receipt uploads on expenses",
      "Multi-user access for your team",
      "Priority support",
    ],
  },
] as const;

export function LandingPricing({ isSignedIn }: LandingPricingProps) {
  return (
    <section id="pricing" className="scroll-mt-20 border-t border-zinc-200 bg-zinc-50 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-emerald-700">Pricing</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            Simple pricing. No per-unit surprises.
          </h2>
          <p className="mt-3 text-zinc-600">
            Start free during early access. Upgrade when Pro launches — your
            portfolio and history stay put.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={
                plan.highlighted
                  ? "relative flex flex-col rounded-2xl border-2 border-zinc-900 bg-white p-8 shadow-xl shadow-zinc-900/5"
                  : "flex flex-col rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm"
              }
            >
              {plan.highlighted ? (
                <span className="absolute -top-3 left-6 rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white">
                  Recommended
                </span>
              ) : null}
              <h3 className="text-lg font-semibold text-zinc-900">{plan.name}</h3>
              <p className="mt-1 text-sm text-zinc-500">{plan.description}</p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight text-zinc-900">
                  {plan.price}
                </span>
                {plan.price !== "Free" ? (
                  <span className="text-sm text-zinc-500">/mo</span>
                ) : null}
              </p>
              <p className="text-xs text-zinc-500">{plan.period}</p>

              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-zinc-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={isSignedIn ? "/dashboard" : "/login"}
                className={
                  plan.highlighted
                    ? "mt-8 inline-flex justify-center rounded-lg bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
                    : "mt-8 inline-flex justify-center rounded-lg border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
                }
              >
                {isSignedIn ? "Open dashboard" : plan.cta}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

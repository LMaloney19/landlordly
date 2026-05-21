import Link from "next/link";
import {
  BarChart3,
  Building2,
  CircleDollarSign,
  FileText,
  Hammer,
  Home,
  Receipt,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { LandingPricing } from "@/components/marketing/landing-pricing";
import { LandingProductPreview } from "@/components/marketing/landing-product-preview";

type LandingPageProps = {
  isSignedIn: boolean;
};

const highlights = [
  { value: "1–50", label: "units per portfolio" },
  { value: "Real-time", label: "rent & expense totals" },
  { value: "Tax-ready", label: "Schedule E CSV export" },
] as const;

const workflows = [
  {
    icon: Building2,
    title: "Properties & units",
    description:
      "Structured addresses, unit labels, bedrooms, and monthly rent roll-ups — not a single messy spreadsheet tab.",
    bullets: ["Multi-unit buildings", "Per-unit rent", "Archive old properties"],
  },
  {
    icon: Users,
    title: "Tenants & leases",
    description:
      "Tenant profiles with lease end dates, payment history, and color-coded expiry warnings on the dashboard.",
    bullets: ["Tenant search & profiles", "60-day lease alerts", "Linked maintenance"],
  },
  {
    icon: BarChart3,
    title: "Reports & taxes",
    description:
      "Monthly P&L with income vs expenses, category breakdowns, charts, and one-click Schedule E export for your CPA.",
    bullets: ["Profit & loss by month", "Category charts", "Tax year CSV download"],
  },
] as const;

export function LandingPage({ isSignedIn }: LandingPageProps) {
  const primaryCta = isSignedIn ? "/dashboard" : "/login";
  const primaryLabel = isSignedIn ? "Open dashboard" : "Start free";

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm">
              <Home className="h-4 w-4" aria-hidden />
            </span>
            Landlordly
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-zinc-600 md:flex">
            <a href="#product" className="transition-colors hover:text-zinc-900">
              Product
            </a>
            <a href="#features" className="transition-colors hover:text-zinc-900">
              Features
            </a>
            <a href="#pricing" className="transition-colors hover:text-zinc-900">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-3">
            {!isSignedIn ? (
              <Link
                href="/login"
                className="hidden text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 sm:inline"
              >
                Sign in
              </Link>
            ) : null}
            <Link
              href={primaryCta}
              className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800"
            >
              {primaryLabel}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-zinc-950 text-white">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.18),transparent)]"
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl px-6 pb-8 pt-16 sm:pt-20">
            <div className="mx-auto max-w-3xl text-center">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                Built for independent landlords
              </p>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                See your whole rental business in one calm dashboard
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-zinc-400">
                Track properties, tenants, rent, expenses, and maintenance — then
                export tax-ready reports without living in spreadsheets.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={primaryCta}
                  className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-zinc-900 shadow-lg transition-colors hover:bg-zinc-100"
                >
                  {primaryLabel}
                </Link>
                <a
                  href="#product"
                  className="rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  See the product
                </a>
              </div>
            </div>

            <ul className="mx-auto mt-14 flex max-w-2xl flex-wrap justify-center gap-8 border-t border-white/10 pt-10">
              {highlights.map(({ value, label }) => (
                <li key={label} className="text-center">
                  <p className="text-2xl font-semibold text-white">{value}</p>
                  <p className="mt-1 text-xs text-zinc-500">{label}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Product preview */}
        <section
          id="product"
          className="scroll-mt-20 bg-zinc-100 pb-20 pt-0"
        >
          <div className="relative mx-auto max-w-6xl px-6">
            <div className="-mt-16 sm:-mt-24">
              <LandingProductPreview />
            </div>
            <p className="mx-auto mt-8 max-w-xl text-center text-sm text-zinc-600">
              The actual Landlordly interface — dashboard, lease alerts, rent
              collections, and sidebar navigation you&apos;ll use every day.
            </p>
          </div>
        </section>

        {/* Workflows */}
        <section id="features" className="scroll-mt-20 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-emerald-700">Features</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
                Every workflow you touch as a small landlord
              </h2>
              <p className="mt-3 text-zinc-600">
                Not enterprise property software. Focused tools for rent collection,
                upkeep, and year-end taxes.
              </p>
            </div>

            <div className="mt-14 space-y-16">
              {workflows.map(({ icon: Icon, title, description, bullets }, index) => (
                <article
                  key={title}
                  className={
                    index % 2 === 0
                      ? "grid items-center gap-10 lg:grid-cols-2"
                      : "grid items-center gap-10 lg:grid-cols-2 lg:[&>*:first-child]:order-2"
                  }
                >
                  <div>
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white">
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="mt-5 text-2xl font-semibold text-zinc-900">{title}</h3>
                    <p className="mt-3 leading-relaxed text-zinc-600">{description}</p>
                    <ul className="mt-5 space-y-2">
                      {bullets.map((item) => (
                        <li
                          key={item}
                          className="flex items-center gap-2 text-sm text-zinc-700"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
                    <MiniFeaturePanel variant={index} />
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Receipt, label: "Rent ledger" },
                { icon: CircleDollarSign, label: "Expense tracking" },
                { icon: Hammer, label: "Maintenance" },
                { icon: FileText, label: "Document storage" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm"
                >
                  <Icon className="h-5 w-5 text-zinc-500" />
                  <span className="text-sm font-medium text-zinc-800">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <LandingPricing isSignedIn={isSignedIn} />

        {/* Trust */}
        <section className="border-t border-zinc-200 py-16">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 text-center sm:flex-row sm:text-left">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Shield className="h-7 w-7" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">
                Your portfolio data stays private and secure
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600">
                Sign in with your own account. Tenant and financial records are
                protected behind secure login — we don&apos;t sell your data or
                share it with advertisers.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-zinc-950 py-20 text-white">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Stop reconciling five spreadsheets every month
            </h2>
            <p className="mt-4 text-zinc-400">
              Set up in minutes. Add a property, invite your tenants, and see the
              dashboard fill in as you work.
            </p>
            <Link
              href={primaryCta}
              className="mt-10 inline-flex rounded-lg bg-white px-8 py-3.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
            >
              {primaryLabel}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <Home className="h-4 w-4" />
            </span>
            Landlordly
          </p>
          <p className="text-xs text-zinc-500">
            Property management for independent landlords
          </p>
        </div>
      </footer>
    </div>
  );
}

function MiniFeaturePanel({ variant }: { variant: number }) {
  if (variant === 0) {
    return (
      <div className="space-y-2 text-sm">
        <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
          <p className="font-medium text-zinc-900">142 Oak Street</p>
          <p className="text-xs text-zinc-500">3 units · $4,850/mo expected</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
          <p className="font-medium text-zinc-900">8 Maple Duplex</p>
          <p className="text-xs text-zinc-500">2 units · $2,400/mo expected</p>
        </div>
      </div>
    );
  }
  if (variant === 1) {
    return (
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white text-xs shadow-sm">
        <div className="grid grid-cols-4 gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2 font-medium text-zinc-500">
          <span className="col-span-2">Tenant</span>
          <span>Lease ends</span>
          <span>Status</span>
        </div>
        {[
          ["Jamie Rivera", "Jun 12", "Active"],
          ["Alex Chen", "Aug 3", "Active"],
          ["Sam Ortiz", "Expired", "Archive"],
        ].map(([name, lease, status]) => (
          <div
            key={name}
            className="grid grid-cols-4 gap-2 border-b border-zinc-50 px-3 py-2 last:border-0"
          >
            <span className="col-span-2 font-medium text-zinc-800">{name}</span>
            <span className="text-zinc-600">{lease}</span>
            <span className="text-zinc-600">{status}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        {[40, 65, 52, 80, 72, 90].map((h, i) => (
          <div
            key={i}
            className="w-full rounded-t bg-emerald-500/80"
            style={{ height: `${h}px` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-zinc-500">
        <span>Income $24.1k</span>
        <span>Expenses $8.4k</span>
        <span className="font-semibold text-emerald-700">NOI $15.7k</span>
      </div>
      <p className="text-center text-xs font-medium text-zinc-700">
        Export Landlordly_TaxReport_2025.csv
      </p>
    </div>
  );
}

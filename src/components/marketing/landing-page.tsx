import Link from "next/link";
import {
  BarChart3,
  Building2,
  CircleDollarSign,
  Hammer,
  Home,
  Receipt,
  Users,
} from "lucide-react";

type LandingPageProps = {
  isSignedIn: boolean;
};

const features = [
  {
    icon: Building2,
    title: "Properties & units",
    description: "Track addresses, units, rent rolls, and bedrooms in one place.",
  },
  {
    icon: Users,
    title: "Tenants & leases",
    description: "Profiles, lease dates, and alerts when leases are expiring soon.",
  },
  {
    icon: Receipt,
    title: "Rent payments",
    description: "Log payments and see what was collected this month.",
  },
  {
    icon: CircleDollarSign,
    title: "Expenses",
    description: "Categorize spending by property for tax time.",
  },
  {
    icon: Hammer,
    title: "Maintenance",
    description: "Open requests tied to properties and units.",
  },
  {
    icon: BarChart3,
    title: "Reports & P&L",
    description: "Profit and loss by month with Schedule E tax export.",
  },
] as const;

export function LandingPage({ isSignedIn }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <Home className="h-4 w-4" aria-hidden />
            </span>
            Landlordly
          </Link>
          <nav className="flex items-center gap-3">
            {isSignedIn ? (
              <Link
                href="/dashboard"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
              >
                Open dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
                >
                  Sign in
                </Link>
                <Link
                  href="/login"
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
                >
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            Built for small landlords
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
            Run your rentals without the spreadsheet chaos
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-600">
            Properties, tenants, rent, expenses, maintenance, and tax-ready reports —
            in one simple dashboard.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {isSignedIn ? (
              <Link
                href="/dashboard"
                className="rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
                >
                  Sign in free
                </Link>
                <Link
                  href="/login"
                  className="rounded-md border border-zinc-200 bg-white px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </section>

        <section className="border-t border-zinc-200 bg-white py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-2xl font-semibold tracking-tight">
              Everything you need day to day
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-zinc-600">
              No bloated property software — just the workflows landlords actually use.
            </p>
            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <li
                  key={title}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-5"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-zinc-900">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    {description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Ready to manage your portfolio?
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Sign in on any device. Your data stays in your Supabase project.
          </p>
          <Link
            href={isSignedIn ? "/dashboard" : "/login"}
            className="mt-8 inline-flex rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            {isSignedIn ? "Open dashboard" : "Get started"}
          </Link>
        </section>
      </main>

      <footer className="border-t border-zinc-200 py-8 text-center text-xs text-zinc-500">
        Landlordly — property management for small landlords
      </footer>
    </div>
  );
}

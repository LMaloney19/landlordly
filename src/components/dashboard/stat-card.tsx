import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  accent?: "default" | "positive" | "warning";
};

const accentStyles = {
  default: "bg-zinc-100 text-zinc-600",
  positive: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = "default",
}: StatCardProps) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <header className="flex items-start justify-between">
        <section>
          <p className="text-sm font-medium text-zinc-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
            {value}
          </p>
          {subtitle ? (
            <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
          ) : null}
        </section>
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            accentStyles[accent],
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </header>
    </article>
  );
}

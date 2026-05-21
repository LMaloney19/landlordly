import { DevBypassBanner } from "@/components/auth/dev-bypass-banner";
import { Sidebar } from "@/components/layout/sidebar";
import { createPageClient } from "@/lib/supabase/page";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const page = await createPageClient();
  const userEmail = page.configured ? page.user?.email : undefined;

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar userEmail={userEmail} />
      <main className="flex-1 overflow-y-auto">
        <DevBypassBanner />
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}

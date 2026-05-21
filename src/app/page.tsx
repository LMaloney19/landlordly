import { LandingPage } from "@/components/marketing/landing-page";
import { createPageClient } from "@/lib/supabase/page";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const page = await createPageClient();
  const isSignedIn = page.configured ? Boolean(page.user) : false;

  return <LandingPage isSignedIn={isSignedIn} />;
}

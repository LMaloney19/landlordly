import { Home } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect: redirectTo, error: authError } = await searchParams;
  const destination = safeRedirectPath(redirectTo);
  const isPortalFlow =
    destination.startsWith("/portal") || destination.includes("/portal/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md">
        <header className="mb-8 flex flex-col items-center text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <Home className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900">
            Landlordly
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {isPortalFlow
              ? "Sign in or create an account to open your tenant portal"
              : "Sign in to manage your properties"}
          </p>
        </header>
        <LoginForm redirectTo={destination} initialError={authError ?? null} />
      </div>
    </div>
  );
}

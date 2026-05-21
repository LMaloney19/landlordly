"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  canUseDevBypass,
  enableDevBypass,
  getDevTestCredentials,
  hasDevBypass,
} from "@/lib/dev-bypass";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type LoginFormProps = {
  redirectTo: string;
  initialError?: string | null;
};

export function LoginForm({ redirectTo, initialError = null }: LoginFormProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(initialError);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const devCredentials = getDevTestCredentials();

  useEffect(() => {
    let cancelled = false;

    async function redirectIfSignedIn() {
      if (hasDevBypass()) {
        window.location.replace(redirectTo);
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!cancelled && user) {
        window.location.replace(redirectTo);
      }
    }

    void redirectIfSignedIn();

    return () => {
      cancelled = true;
    };
  }, [redirectTo]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setPending(false);
      return;
    }

    window.location.assign(redirectTo);
  }

  async function handleDevTestSignIn() {
    if (!devCredentials) return;
    setError(null);
    setMessage(null);
    setPending(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword(
      devCredentials,
    );

    if (signInError) {
      setError(signInError.message);
      setPending(false);
      return;
    }

    window.location.assign(redirectTo);
  }

  function handleDevBypass() {
    enableDevBypass();
    window.location.assign(redirectTo);
  }

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setPending(false);
      return;
    }

    if (data.session) {
      window.location.assign(redirectTo);
      return;
    }

    setMessage(
      "Account created. If email confirmation is enabled in Supabase, check your inbox. Otherwise try signing in.",
    );
    setPending(false);
    setMode("signin");
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <nav className="mb-6 flex rounded-md bg-zinc-100 p-1">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
            mode === "signin"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-600 hover:text-zinc-900",
          )}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
            mode === "signup"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-600 hover:text-zinc-900",
          )}
        >
          Sign up
        </button>
      </nav>

      {mode === "signin" ? (
        <form onSubmit={handleSignIn}>
          <fieldset className="space-y-4" disabled={pending}>
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">Email</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="mt-1.5 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">Password</span>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                autoComplete="current-password"
                className="mt-1.5 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
            </label>
          </fieldset>

          {error ? (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="mt-6 w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>

          {canUseDevBypass() ? (
            <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
              {devCredentials ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={handleDevTestSignIn}
                  className="w-full rounded-md border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
                >
                  Use dev test account
                </button>
              ) : null}
              <button
                type="button"
                disabled={pending}
                onClick={handleDevBypass}
                className="w-full rounded-md border border-dashed border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-60"
              >
                Continue in dev mode
              </button>
              <p className="text-xs text-zinc-500">
                Dev mode lets you browse while building. Add
                NEXT_PUBLIC_DEV_AUTH_EMAIL and NEXT_PUBLIC_DEV_AUTH_PASSWORD to
                .env.local to make the test account button save real data.
              </p>
            </div>
          ) : null}
        </form>
      ) : (
        <form onSubmit={handleSignUp}>
          <fieldset className="space-y-4" disabled={pending}>
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">Email</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="mt-1.5 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">Password</span>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="mt-1.5 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
            </label>
          </fieldset>

          {error ? (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="mt-4 text-sm text-emerald-700" role="status">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="mt-6 w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
          >
            {pending ? "Please wait…" : "Create account"}
          </button>
        </form>
      )}
    </section>
  );
}

import {
  createServerClient,
  type CookieOptions,
  type SetAllCookies,
} from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/config";
import { routeHandlerAuthOptions } from "@/lib/supabase/server-options";

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

export function createRequestSupabaseClient(request: NextRequest) {
  const pendingCookies: PendingCookie[] = [];

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      auth: routeHandlerAuthOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          cookiesToSet.forEach((cookie) => {
            pendingCookies.push(cookie);
          });
        },
      },
    },
  );

  function applyCookiesToResponse<T extends NextResponse>(response: T): T {
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  }

  return { supabase, applyCookiesToResponse };
}

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Refreshes the auth session cookie on every request. Route protection
 * itself lives in dashboard/layout.tsx (server-side, via getUser()).
 *
 * Deliberately untyped with our Database generic (this file only calls
 * auth.getUser(), never a table query, so there's nothing to type-check
 * against it) — Vercel's Edge Function bundler traces this file's own
 * dependency graph separately from the main Next.js build, and it can't
 * follow @plateato/core's file: symlink outside web/, failing the deploy
 * with "referencing unsupported modules" even for a type-only import. */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Revalidates the session against Supabase Auth (not just reading the
  // cookie) — required so getUser() elsewhere can trust the result.
  await supabase.auth.getUser();

  return supabaseResponse;
}

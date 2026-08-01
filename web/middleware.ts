import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the auth session cookie on every request. Route protection
 * itself lives in dashboard/layout.tsx (server-side, via getUser()).
 *
 * This used to call out to a lib/supabase/middleware.ts helper (matching
 * Supabase's own documented pattern). Vercel's Edge Function bundler traces
 * this entry point's dependency graph separately from the main Next.js
 * build, and it kept failing with "referencing unsupported modules"
 * pointing at that helper file — even after removing the only external
 * (@plateato/core) import it had. Inlining everything into the canonical
 * middleware.ts entry point removes any ambiguity about what that trace is
 * actually following.
 */
export async function middleware(request: NextRequest) {
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

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

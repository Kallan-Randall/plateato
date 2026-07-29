/**
 * Resolves this deployment's own origin, for building absolute redirect
 * URLs (e.g. emailRedirectTo). Prefers an explicit site URL, falls back to
 * Vercel's auto-populated deployment URL, then localhost for dev.
 */
export function getURL(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null) ??
    'http://localhost:3000';
  return url.endsWith('/') ? url : `${url}/`;
}

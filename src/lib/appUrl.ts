/**
 * Derives the app's public origin from the incoming request.
 *
 * Priority:
 *  1. x-forwarded-proto + x-forwarded-host  (Railway / any reverse proxy)
 *  2. host header                            (direct / local)
 *  3. request.url origin                    (fallback)
 *
 * We intentionally do NOT read NEXT_PUBLIC_APP_URL here because that env var
 * is often set to localhost in local .env files and would break production
 * OAuth redirects if accidentally deployed with a stale value.
 */
export function getAppOrigin(request: Request): string {
  const proto =
    request.headers.get('x-forwarded-proto')?.split(',')[0].trim() ??
    new URL(request.url).protocol.replace(':', '')

  const host =
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    new URL(request.url).host

  return `${proto}://${host}`
}

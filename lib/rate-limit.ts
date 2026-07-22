/**
 * Sliding-window rate limit held in process memory.
 *
 * This is per-instance: two serverless instances each allow the full quota, and
 * the window resets on cold start. That's an acceptable trade for a marketing
 * form whose real spam defence is the honeypot plus validation. If this ever
 * needs to be exact, swap the Map for Upstash Redis — the call signature stays.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;
/** Stop the Map growing without bound on a long-lived instance. */
const MAX_TRACKED_KEYS = 10_000;

const hits = new Map<string, number[]>();

export type RateLimitResult = {
  ok: boolean;
  /** Seconds until the caller may retry. Only meaningful when `ok` is false. */
  retryAfter: number;
};

export function rateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);

  if (recent.length >= MAX_REQUESTS) {
    hits.set(key, recent);
    const retryAfter = Math.ceil((recent[0] + WINDOW_MS - now) / 1000);
    return { ok: false, retryAfter: Math.max(1, retryAfter) };
  }

  recent.push(now);
  hits.set(key, recent);

  if (hits.size > MAX_TRACKED_KEYS) {
    for (const [k, times] of hits) {
      if (times.every((t) => t <= cutoff)) hits.delete(k);
    }
  }

  return { ok: true, retryAfter: 0 };
}

/**
 * How many proxies sit in front of this app and are trusted to append to
 * X-Forwarded-For. One (a single edge/CDN in front) covers Vercel and most
 * managed hosts.
 */
const TRUSTED_PROXY_HOPS = Number(process.env.TRUSTED_PROXY_HOPS ?? 1);

/**
 * Client IP for rate limiting.
 *
 * X-Forwarded-For is `client, proxy1, proxy2…`, and every entry except the ones
 * your own trusted proxies appended is attacker-controlled. Taking the leftmost
 * value — the obvious reading — lets anyone bypass the limit entirely just by
 * sending a different header each request. Count in from the right instead.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    if (hops.length) {
      const index = Math.max(0, hops.length - Math.max(1, TRUSTED_PROXY_HOPS));
      return hops[index];
    }
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

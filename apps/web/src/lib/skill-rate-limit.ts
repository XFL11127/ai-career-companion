/**
 * Short-window abuse guard for unauthenticated Skill requests.
 * It is intentionally keyed by network address rather than any client-supplied user identifier.
 * A shared limiter replaces this per-instance guard when the authenticated production backend lands.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;
const buckets = new Map<string, { count: number; resetAt: number }>();

function clientAddress(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export function takeSkillRateLimit(
  request: Request,
  skillName: string
): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const key = `${clientAddress(request)}:${skillName}`;
  const existing = buckets.get(key);
  const current =
    !existing || existing.resetAt <= now ? { count: 0, resetAt: now + WINDOW_MS } : existing;
  current.count += 1;
  buckets.set(key, current);

  if (buckets.size > 10_000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  return {
    allowed: current.count <= MAX_REQUESTS_PER_WINDOW,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
  };
}

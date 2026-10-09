import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { ApiError } from "@/lib/api";

type LocalBucket = { count: number; resetAt: number };
const localBuckets = new Map<string, LocalBucket>();
const distributedLimiters = new Map<string, Ratelimit>();

export async function enforceRateLimit(request: Request, scope: string, limit: number, windowMs: number): Promise<void> {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = `${scope}:${address}`;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      let limiter = distributedLimiters.get(scope);
      if (!limiter) {
        limiter = new Ratelimit({
          redis: new Redis({ url, token }),
          limiter: Ratelimit.slidingWindow(limit, `${Math.ceil(windowMs / 1000)} s`),
          analytics: false,
          prefix: "gyan-bhandar",
        });
        distributedLimiters.set(scope, limiter);
      }
      const result = await limiter.limit(key);
      if (!result.success) throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please try again shortly.");
      return;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(503, "RATE_LIMIT_UNAVAILABLE", "This service is temporarily unavailable.");
    }
  }

  if (process.env.NODE_ENV === "production") {
    throw new ApiError(503, "RATE_LIMIT_NOT_CONFIGURED", "This service is not fully configured.");
  }

  const now = Date.now();
  const bucket = localBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    localBuckets.set(key, { count: 1, resetAt: now + windowMs });
  } else if (bucket.count >= limit) {
    throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please try again shortly.");
  } else {
    bucket.count += 1;
  }
  if (localBuckets.size > 10000) {
    for (const [bucketKey, value] of localBuckets) if (value.resetAt <= now) localBuckets.delete(bucketKey);
  }
}
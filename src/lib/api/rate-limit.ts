type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  source: "upstash" | "memory";
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

type UpstashLimitResult = {
  success: boolean;
  reset: number;
};

const upstashState: {
  limit: null | ((key: string, maxRequests: number, windowMs: number) => Promise<UpstashLimitResult>);
  initialized: boolean;
} = {
  limit: null,
  initialized: false,
};

function now() {
  return Date.now();
}

async function getUpstashLimitFn() {
  if (upstashState.initialized) return upstashState.limit;

  upstashState.initialized = true;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) {
    upstashState.limit = null;
    return null;
  }

  try {
    const [{ Redis }, { Ratelimit }] = await Promise.all([
      import("@upstash/redis"),
      import("@upstash/ratelimit"),
    ]);

    const redis = Redis.fromEnv();
    const limiterCache = new Map<string, InstanceType<typeof Ratelimit>>();

    upstashState.limit = async (key: string, maxRequests: number, windowMs: number) => {
      const seconds = Math.max(1, Math.ceil(windowMs / 1000));
      const cacheKey = `${maxRequests}:${seconds}`;

      let limiter = limiterCache.get(cacheKey);
      if (!limiter) {
        limiter = new Ratelimit({
          redis,
          prefix: "vip:ratelimit",
          limiter: Ratelimit.fixedWindow(maxRequests, `${seconds} s`),
          analytics: false,
        });
        limiterCache.set(cacheKey, limiter);
      }

      const result = await limiter.limit(key);
      return {
        success: result.success,
        reset: result.reset,
      };
    };

    return upstashState.limit;
  } catch (error) {
    console.warn("[rate-limit] Upstash client init failed, using in-memory fallback", error);
    upstashState.limit = null;
    return null;
  }
}

function memoryRateLimitByKey(key: string, maxRequests: number, windowMs: number): RateLimitResult {
  const currentTime = now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= currentTime) {
    buckets.set(key, {
      count: 1,
      resetAt: currentTime + windowMs,
    });

    return {
      allowed: true,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
      source: "memory",
    };
  }

  if (current.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - currentTime) / 1000)),
      source: "memory",
    };
  }

  current.count += 1;
  buckets.set(key, current);

  return {
    allowed: true,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - currentTime) / 1000)),
    source: "memory",
  };
}

export function getRequestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") || "unknown";
}

export async function rateLimitByKey(key: string, maxRequests: number, windowMs: number): Promise<RateLimitResult> {
  const upstashLimit = await getUpstashLimitFn();

  if (!upstashLimit) {
    return memoryRateLimitByKey(key, maxRequests, windowMs);
  }

  try {
    const result = await upstashLimit(key, maxRequests, windowMs);
    return {
      allowed: result.success,
      retryAfterSeconds: Math.max(1, Math.ceil((result.reset - now()) / 1000)),
      source: "upstash",
    };
  } catch (error) {
    console.warn("[rate-limit] Upstash limit request failed, using in-memory fallback", error);
    return memoryRateLimitByKey(key, maxRequests, windowMs);
  }
}

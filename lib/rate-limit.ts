import { NextResponse } from "next/server";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitBucket>;

declare global {
  var __yumRateLimitStores: Map<string, RateLimitStore> | undefined;
}

function getStores() {
  if (!globalThis.__yumRateLimitStores) {
    globalThis.__yumRateLimitStores = new Map();
  }

  return globalThis.__yumRateLimitStores;
}

function getStore(namespace: string) {
  const stores = getStores();
  let store = stores.get(namespace);

  if (!store) {
    store = new Map();
    stores.set(namespace, store);
  }

  return store;
}

function pruneExpired(store: RateLimitStore, now: number) {
  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) {
    return cfIp;
  }

  return "unknown";
}

export function takeRateLimit(params: {
  namespace: string;
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const store = getStore(params.namespace);

  if (store.size > 10_000) {
    pruneExpired(store, now);
  }

  const bucket = store.get(params.key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(params.key, {
      count: 1,
      resetAt: now + params.windowMs,
    });

    return {
      allowed: true as const,
      remaining: Math.max(0, params.limit - 1),
      retryAfterSeconds: 0,
    };
  }

  if (bucket.count >= params.limit) {
    return {
      allowed: false as const,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;

  return {
    allowed: true as const,
    remaining: Math.max(0, params.limit - bucket.count),
    retryAfterSeconds: 0,
  };
}

export function jsonRateLimited(code: string, message: string, retryAfterSeconds: number) {
  return NextResponse.json(
    { error: { code, message } },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

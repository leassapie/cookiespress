import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "../types/hono-bindings";
import { getIp } from "./get-ip";
import { getStateStore, isDistributed } from "./state-store";
import { validateEnv } from "./env";

const { RATE_LIMIT_ENABLED, SLOW_DOWN_ENABLED } = validateEnv();

type Counter = { count: number; resetAt: number };

const WINDOW_MS = 15 * 60 * 1000;
const LIMIT_MAX = 50;
const SLOW_LIMIT = 40;
const BUCKET_MAX_SIZE = 50000;
const SWEEP_MS = 30000;
const buckets = new Map<string, Counter>();
let overflowCounter: Counter | null = null;

// ── In-memory path (fallback when Redis is not configured) ─────────────

function touchSync(key: string): Counter {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current && buckets.size >= BUCKET_MAX_SIZE) {
    if (!overflowCounter || overflowCounter.resetAt <= now) {
      overflowCounter = { count: 1, resetAt: now + WINDOW_MS };
      return overflowCounter;
    }
    overflowCounter.count += 1;
    return overflowCounter;
  }

  if (!current || current.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + WINDOW_MS };
    buckets.set(key, fresh);
    return fresh;
  }
  current.count += 1;
  return current;
}

function sweepExpiredBuckets() {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

setInterval(sweepExpiredBuckets, SWEEP_MS).unref();

// ── Redis path (distributed, when REDIS_URL is set) ───────────────────

async function touchAsync(key: string): Promise<Counter> {
  const store = getStateStore();
  const now = Date.now();
  const raw = await store.get(key) as Counter | undefined;

  if (!raw || raw.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + WINDOW_MS };
    const ttlMs = Math.max(1000, WINDOW_MS);
    await store.set(key, fresh, ttlMs);
    return fresh;
  }

  raw.count += 1;
  const ttlMs = Math.max(1000, raw.resetAt - now);
  await store.set(key, raw, ttlMs);
  return raw;
}

// ── Unified touch ────────────────────────────────────────────────────

function touch(key: string): Counter | Promise<Counter> {
  return isDistributed() ? touchAsync(key) : touchSync(key);
}

// ── Middleware ────────────────────────────────────────────────────────

const slow: MiddlewareHandler<AppBindings> = async (c, next) => {
  if (SLOW_DOWN_ENABLED === "false" || c.req.method === "OPTIONS") {
    await next();
    return;
  }
  if (!isDistributed() && buckets.size > BUCKET_MAX_SIZE) sweepExpiredBuckets();
  const key = `slow:${getIp(c.req.raw.headers)}:${c.req.path}`;
  const bucket = await touch(key);
  if (bucket.count > SLOW_LIMIT) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000));
    c.header("Retry-After", String(retryAfterSec));
    return c.json({ message: "Too many requests, please slow down" }, 429);
  }
  await next();
};

const limiter: MiddlewareHandler<AppBindings> = async (c, next) => {
  if (RATE_LIMIT_ENABLED === "false" || c.req.method === "OPTIONS") {
    await next();
    return;
  }
  if (!isDistributed() && buckets.size > BUCKET_MAX_SIZE) sweepExpiredBuckets();
  const key = `limit:${getIp(c.req.raw.headers)}:${c.req.path}`;
  const bucket = await touch(key);
  const remaining = Math.max(0, LIMIT_MAX - bucket.count);
  c.header("X-RateLimit-Limit", String(LIMIT_MAX));
  c.header("X-RateLimit-Remaining", String(remaining));
  c.header("X-RateLimit-Reset", String(Math.floor(bucket.resetAt / 1000)));
  if (bucket.count > LIMIT_MAX) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000));
    c.header("Retry-After", String(retryAfterSec));
    return c.json({ message: "Too nasty, please slow down" }, 429);
  }
  await next();
};

export { limiter, slow };
# High Traffic hardening plan

## Current assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| Caching (Redis) | ✅ Keyv + Redis | Shared cache across instances |
| Circuit breaker | ✅ Per-host, 5min cooldown | In-memory only |
| Rate limiting | ✅ 50 req/15min per IP | In-memory only |
| Request timeout | ✅ 10s request, 5s connect | Prevents hangs |
| Prometheus metrics | ✅ `/metrics` endpoint | Can monitor bottlenecks |
| Concurrency limit | ❌ None | Up to N concurrent outgoing requests |
| Slow-down strategy | ⚠️ Progressive delay | Holds connections, can pool-exhaust |
| Multi-instance support | ❌ Per-instance state | Rate limiter + circuit breaker not shared |

---

## P1 — Concurrency limiter (upstream)

**Problem:** No limit on concurrent outgoing HTTP requests to upstream sites. Under high traffic the server can open thousands of concurrent connections, leading to:
- Upstream IP ban (rate limiting from their side)
- Local port exhaustion (ephemeral port range ~28k on Linux)
- File descriptor exhaustion

**Solution:** Add a semaphore that limits concurrent outgoing requests per upstream host.

```ts
// src/utils/concurrency-limiter.ts
const limits = new Map<string, { sema: Semaphore; max: number }>();

const DEFAULTS = {
  "nhentai.net":    15,
  "hentaifox.com":  10,
  "asmhentai.com":  10,
  "hentai2read.com": 10,
  "3hentai.net":    10,
  "ipwho.is":        2,
};

export async function withLimit<T>(host: string, fn: () => Promise<T>): Promise<T> {
  let entry = limits.get(host);
  if (!entry) {
    const max = DEFAULTS[host as keyof typeof DEFAULTS] ?? 10;
    entry = { sema: new Semaphore(max), max };
    limits.set(host, entry);
  }
  return entry.sema.run(fn);
}
```

**Integration:** Wrap `got()` calls in `JandaPress.fetchBody`, `simulateNhentaiRequest`, and `getServer` with `withLimit(host, ...)`.

**Files to change:** `src/JandaPress.ts`, `src/utils/modifier.ts` (hentaiFoxPredictedExtension)

---

## P2 — Slow-down → immediate 429

**Problem:** The `slow` middleware delays requests progressively (1s → 20s) after the 50th request. Delayed requests hold open connections, which can exhaust the connection pool and cause a self-inflicted denial of service.

**Solution:** Replace progressive delay with immediate 429 response after the rate limit is exceeded. The `limiter` middleware already returns 429 — the `slow` middleware should do the same instead of delaying.

```ts
// In src/utils/limit-options.ts
// Change: slow() returns 429 directly instead of delaying
if (bucket.count > SLOW_DELAY_AFTER) {
  const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000));
  c.header("Retry-After", String(retryAfterSec));
  return c.json({ message: "Too many requests, please slow down" }, 429);
}
```

**Files to change:** `src/utils/limit-options.ts`

---

## P3 — Distributed rate limiter (Redis)

**Problem:** Rate limiter state is in-memory (`Map<String, Counter>`). With multiple instances behind a load balancer, each instance tracks limits independently. An attacker can send 50 req/instance.

**Solution:** Use Keyv (already a dependency) with Redis backend for rate limit state. Falls back to in-memory when Redis is not configured.

```ts
// In src/utils/limit-options.ts
// Optional: use Keyv with Redis for shared rate limit state
import Keyv from "keyv";

const rateLimitStore = process.env.REDIS_URL
  ? new Keyv({ store: new KeyvRedis(process.env.REDIS_URL) })
  : null;

async function touch(key: string): Promise<Counter> {
  if (rateLimitStore) {
    // Atomic increment via Redis
    const raw = await rateLimitStore.get(key);
    // ...
  }
  // Fallback to in-memory
}
```

**Files to change:** `src/utils/limit-options.ts`

---

## P4 — Shared circuit breaker (Redis, optional)

**Problem:** Circuit breaker state is per-instance. When nhentai is down, each instance independently discovers it and opens its circuit — each instance sends 3 failed requests before opening.

**Solution:** Store circuit breaker state in Redis so all instances share the same state.

**Complexity:** Higher than P3 because circuit breaker state includes timestamps and failure counts that need atomic updates.

**Files to change:** `src/utils/circuit-breaker.ts`

---

## Priority Matrix

| Item | Effort | Impact | Risk | Priority |
|------|--------|--------|------|----------|
| P1 — Concurrency limiter | Small | **High** — prevents IP ban + port exhaustion | Low | **1** |
| P2 — Slow-down → 429 | Trivial | **High** — prevents connection pool exhaustion | Low | **2** |
| P3 — Redis rate limiter | Medium | Medium — needed for horizontal scaling | Medium | 3 |
| P4 — Shared circuit breaker | Medium | Low — nice to have | Medium | 4 |

## Recommended order

1. **P2 first** (5 minutes, 1 file, trivial change, high impact)
2. **P1 second** (30 minutes, 1-2 files, well-defined scope)
3. **P3 third** (1-2 hours, when multi-instance deployment is needed)
4. **P4 last** (optional, only if running multiple instances)
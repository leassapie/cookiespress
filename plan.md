# High Traffic hardening plan

## Status: ✅ All items implemented

| Item | Status | Gated by |
|------|--------|----------|
| P1 — Concurrency limiter | ✅ Always active | — |
| P2 — Slow-down → 429 | ✅ Always active | — |
| P3 — Redis rate limiter | ✅ Optional | `REDIS_URL` env var |
| P4 — Shared circuit breaker | ✅ Optional | `REDIS_URL` env var |

## How it works

All distributed features (P3, P4) are **gated by the `REDIS_URL` environment variable**:

- **`REDIS_URL` is set** → rate limiter + circuit breaker use Redis for distributed state across all instances. State is shared via a central Keyv+Redis store.
- **`REDIS_URL` is unset** → rate limiter + circuit breaker use in-memory (per-instance, same as before).

No other configuration needed — just set `REDIS_URL` in `.env` to enable distributed mode.

## Current assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| Caching (Redis) | ✅ Keyv + Redis | Shared cache across instances |
| Circuit breaker | ✅ Per-host, 5min cooldown | In-memory or Redis |
| Rate limiting | ✅ 50 req/15min per IP | In-memory or Redis |
| Request timeout | ✅ 10s request, 5s connect | Prevents hangs |
| Prometheus metrics | ✅ `/metrics` endpoint | Can monitor bottlenecks |
| Concurrency limit | ✅ Per-host semaphore | 15 nhentai, 10 others |
| Slow-down strategy | ✅ Immediate 429 | No connection holding |
| Multi-instance support | ✅ Optional via Redis | Rate limiter + circuit breaker |

## Implementation details

### P1 — Concurrency limiter

**File:** `src/utils/concurrency-limiter.ts`

Semaphore-based per-host limiter. Limits concurrent outgoing HTTP requests:

| Host | Max concurrent |
|------|---------------|
| nhentai.net | 15 |
| hentaifox.com | 10 |
| asmhentai.com | 10 |
| hentai2read.com | 10 |
| 3hentai.net | 10 |
| ipwho.is | 2 |
| Others (default) | 10 |

### P2 — Immediate 429

**File:** `src/utils/limit-options.ts`

- `slow` middleware returns 429 at 40 req/15min (soft cap)
- `limiter` middleware returns 429 at 50 req/15min (hard cap)
- Both include `Retry-After` and `X-RateLimit-*` headers

### P3 — Distributed rate limiter

**File:** `src/utils/state-store.ts` + `src/utils/limit-options.ts`

When `REDIS_URL` is set, `touch()` uses Keyv with Redis. Falls back to in-memory `Map`.

### P4 — Shared circuit breaker

**File:** `src/utils/state-store.ts` + `src/utils/circuit-breaker.ts`

All circuit breaker functions (`isCircuitOpen`, `recordSuccess`, `recordFailure`, `getOpenCircuits`) are now async. When `REDIS_URL` is set, they use Keyv with Redis. Falls back to in-memory `Map`.

**Note:** `getOpenCircuits()` returns an empty array in Redis mode because Keyv doesn't support key iteration. Individual `isCircuitOpen()` checks still work correctly.
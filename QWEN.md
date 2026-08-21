# Jandapress — Project Context

## Overview

**Jandapress** (v10.2.0-alpha) is a unified REST + GraphQL API for doujinshi aggregation, built with **Bun** + **Hono** (TypeScript). It scrapes and normalizes data from multiple doujin websites into a consistent JSON format, providing `get`, `search`, and `random` endpoints for each source.

**Repository**: `github.com/sinkaroid/jandapress`  
**Author**: @sinkaroid  
**License**: MIT  
**Package manager**: `bun >= 1.3.14`

---

## Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun (JavaScriptCore, native TS/JSX) |
| HTTP framework | Hono v4 |
| GraphQL | graphql v17 (custom schema, no Yoga/Apollo) |
| HTTP client | `got` v15 (replaced `node-fetch`) |
| HTML parsing | cheerio |
| Caching | Keyv (Redis or in-memory) |
| Rate limiting | In-memory sliding window (custom) |
| Circuit breaker | In-memory per-host (custom) |
| Validation | Zod v4 (runtime) |
| Telemetry | prom-client + @hono/prometheus |
| Linting | ESLint + @typescript-eslint |
| OpenAPI | @hono/zod-openapi + @hono/swagger-ui |

### Module Structure

```
src/
├── index.ts           # Entry point — Hono app bootstrap, routes, middleware
├── JandaPress.ts      # Core class: HTTP fetching, caching, circuit breaker integration
├── router/
│   └── endpoint.ts    # Route registration (17 REST endpoints)
├── controller/        # Route handlers (Express-compat adapter pattern)
│   ├── nhentai/       # get, search, random, related
│   ├── hentaifox/     # get, search, random
│   ├── asmhentai/     # get, search, random
│   ├── hentai2read/   # get, search
│   ├── 3hentai/       # get, search, random
│   └── search-all.ts  # Parallel search across all sources
├── scraper/           # HTML/JSON scraping logic per source
│   ├── nhentai/       # (official API v2, no cheerio)
│   ├── hentaifox/     # cheerio-based HTML parsing
│   ├── asmhentai/     # cheerio-based HTML parsing
│   ├── hentai2read/   # cheerio + window.gData extraction
│   └── 3hentai/       # cheerio-based HTML parsing
├── graphql/
│   ├── schema.ts      # Full GraphQL schema (5 source types)
│   └── handler.ts     # GET/POST GraphQL handler
├── lib/
│   └── openapi-spec.ts # OpenAPI spec generation
├── interfaces/        # TypeScript interfaces for scraped data
├── types/             # TypeScript type definitions
└── utils/             # Shared utilities
    ├── circuit-breaker.ts  # Per-host circuit breaker (3-fail threshold, 5min cooldown)
    ├── constants.ts        # Site URLs
    ├── env.ts              # Zod-validated env config
    ├── get-ip.ts           # IP extraction from trusted headers
    ├── limit-options.ts    # Rate limiter + slow-down middleware
    ├── logger.ts           # JSON-structured logger (debug/info/warn/error)
    ├── metrics.ts          # Prometheus metrics (RSS, CPU, event loop, heap, inflight)
    ├── modifier.ts         # Utility functions (UA, date formatting, nhentai helpers)
    ├── nhentai.ts          # nhentai API URL builders + v2 mappers
    └── scraper-schemas.ts  # Zod validation schemas per source
```

### Data Flow

```
Client → Hono Router → Middleware (CORS, rate-limit, slow-down, Prometheus)
  → Controller (Express-compat adapter)
    → Scraper (fetch + cheerio parse or API JSON)
      → JandaPress.fetchBody / fetchJson / simulateNhentaiRequest
        → got (HTTP) → Keyv cache (optional Redis)
```

### Sources (7 total)

| Source | Type | Scraping Method | Endpoints | Sort Options |
|--------|------|----------------|-----------|--------------|
| nhentai | Official API v2 | JSON API | get, search, related, random | date, popular, popular-today, popular-week, popular-month |
| hentaifox | HTML | cheerio | get, search, random | latest, popular |
| asmhentai | HTML | cheerio | get, search, random | — |
| hentai2read | HTML | cheerio + window.gData | get, search | — |
| 3hentai | HTML | cheerio | get, search, random | recent, popular-24h, popular-7d, popular |
| pururin | (removed) | — | — | — |
| simply-hentai | (removed) | — | — | — |

---

## Building & Running

### Prerequisites

- **Bun** >= 1.3.14
- **Redis** (optional, for persistent caching)
- Copy `.env.schema` → `.env` and configure

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | HTTP server port |
| `JANDAPRESS_GRAPHQL` | false | Enable GraphQL endpoint (`"true"` to enable) |
| `REDIS_URL` | — | Redis connection string (omit for in-memory) |
| `EXPIRE_CACHE` | 1 | Cache TTL in hours |
| `NHENTAI_API_KEY` | — | nhentai API key (optional) |
| `USER_AGENT` | auto | Custom User-Agent header |
| `RUN_MODE` | debug | `"prod"` silences all logging |
| `LOG_LEVEL` | info | Filter: debug, info, warn, error |
| `ALLOW_UNTRUSTED_PROXY_HEADERS` | false | Allow x-forwarded-for / x-real-ip |

### Commands

```bash
# Install dependencies
bun install

# Development (hot reload)
bun run start:dev

# Production build + run
bun run build
bun run start:prod

# Lint
bun run lint
bun run lint:fix
```

### Docker

```bash
docker pull ghcr.io/sinkaroid/jandapress:latest
docker run -p 3000:3000 -d ghcr.io/sinkaroid/jandapress:latest
```

### Endpoints

| Path | Description |
|------|-------------|
| `/` | Index / health summary |
| `/health` | Health check (no external calls) |
| `/docs` | OpenAPI spec (JSON) |
| `/playground` | Swagger UI |
| `/metrics` | Prometheus metrics |
| `/graphql` | GraphQL endpoint (gated behind env var) |
| `/search/all` | Aggregate search across all sources |
| `/:source/{get,search,related,random}` | Per-source endpoints |
| `/g/:id` | Redirect to nhentai.net/g/:id |
| `/h/:id` | Redirect to hentaifox.com/gallery/:id |
| `/a/:id` | Redirect to asmhentai.com/g/:id |

---

## Testing

### Test Structure

Tests live in `/test/` using Bun's built-in test runner (`bun:test`):

| File | Type | Description |
|------|------|-------------|
| `test.ts` | Integration | Site availability check (HEAD to each source) |
| `jandapress.test.ts` | Integration | Real HTTP tests against all 5 sources |
| `graphql.test.ts` | Integration | GraphQL query tests against all 5 sources |
| `unit-scrapers.test.ts` | Unit | Mocked scraper tests (fixtures, no network) |
| `circuit-breaker.test.ts` | Unit | Circuit breaker logic tests |
| `nh.ts` | Utility | nhentai API connectivity test |

### Mock System

Unit tests use `mock.module("got", ...)` to replace the `got` HTTP client with pre-registered fixtures. Fixtures are defined in `test/helpers/mock-scraper.ts` as inline HTML/JSON strings.

### Test Commands

```bash
# All unit tests (mocked, no network required)
bun run test:unit

# All integration tests (require network)
bun run test

# Per-source integration
bun run test:nhentai
bun run test:hentaifox
bun run test:asmhentai
bun run test:hentai2read
bun run test:3hentai

# GraphQL integration tests
bun run test:graphql:all

# Site availability check
bun run test:scrape
```

---

## Development Conventions

### Code Style

- **Language**: TypeScript (strict mode, `ESNext` target)
- **Quotes**: Double quotes (`"`)
- **Semicolons**: Required
- **Indentation**: 2 spaces
- **Line endings**: LF
- **Linting**: ESLint + @typescript-eslint
- **No unused variables**: Enforced (`_` prefix for ignored params)

### Architecture Patterns

1. **Controller-Scraper separation**: Controllers handle HTTP concerns (param validation, logging, response). Scrapers handle data extraction logic.
2. **Native Hono Context**: All controllers use Hono's `Context<AppBindings>` directly (migrated from legacy Express adapter pattern). No adapter layer needed.
3. **Zod validation at scraper boundaries**: Each scraper's output is validated against a Zod schema before returning to the controller.
4. **Circuit breaker per host**: 3 consecutive failures (5xx/429/transport errors) trip the breaker for 5 minutes. 4xx errors do NOT trip the breaker.
5. **Rate limiting**: 50 requests per 15-minute window per IP per path. Slow-down kicks in after 50 requests.
6. **Caching**: Keyv with Redis backend (or in-memory fallback). Cache TTL = `EXPIRE_CACHE` hours. Random endpoints bypass cache.

### Contribution Guidelines

- Discuss major changes via issue/email first
- PRs are welcome for any improvements
- Code of Conduct applies to all interactions
- See `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`

### API Response Format

All endpoints return JSON with a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "source": "https://nhentai.net/g/577774"
}
```

Error responses:

```json
{
  "success": false,
  "message": "Parameter book is required"
}
```

### HTTP Status Codes

- `200` — Success
- `400` — Bad request (missing/invalid params)
- `404` — Not found
- `429` — Rate limited
- `500` — Internal error

---

## Key Design Decisions

1. **nhentai uses official API v2** (not scraping) — the only source with a supported API. All others use HTML scraping.
2. **pururin and simply-hentai were removed** — the scrapers were dropped in a recent refactor (commit `9a522f9`).
3. **GraphQL is experimental** — gated behind `JANDAPRESS_GRAPHQL=true`, uses raw `graphql` library (no Yoga/Apollo).
4. **Logging is silenced in prod mode** — `RUN_MODE=prod` suppresses all log output.
5. **Controllers use native Hono Context** — fully migrated from the legacy Express adapter pattern. All handlers accept `c: Context<AppBindings>` and return `c.json()` directly.
6. **No authentication** — the service is anonymous and public (CORS enabled). JWT auth is planned for future releases.
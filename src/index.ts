import { Hono } from "hono";
import { prometheus } from "@hono/prometheus";
import { swaggerUI } from "@hono/swagger-ui";
import { janda } from "./JandaPress";
import type { AppBindings } from "./types/hono-bindings";
import scrapeRoutes from "./router/endpoint";
import { openAPISpec } from "./lib/openapi-spec";
import { slow, limiter } from "./utils/limit-options";
import { getIp } from "./utils/get-ip";
import { logger } from "./utils/logger";
import { isNumeric } from "./utils/modifier";
import { registry, inflightMiddleware, startSystemMetrics, stopSystemMetrics } from "./utils/metrics";
import * as pkg from "../package.json";
import { graphqlHandler } from "./graphql/handler";
import { validateEnv } from "./utils/env";
import { getOpenCircuits } from "./utils/circuit-breaker";

// Validate environment at startup — fail fast on misconfiguration
const env = validateEnv();

const app = new Hono<AppBindings>();

// ── Prometheus Telemetry ────────────────────────────

const { printMetrics, registerMetrics } = prometheus({
  registry,
});

app.use("*", inflightMiddleware);
app.use("*", registerMetrics);
app.get("/metrics", printMetrics);

// ── System Metrics Collector ────────────────────────

startSystemMetrics();

// Stop metrics collection on shutdown. Must call process.exit() explicitly:
// registering a SIGINT/SIGTERM handler disables Bun's default Ctrl+C exit behavior.
function shutdown() {
  stopSystemMetrics();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// ── Health Check (no external calls) ────────────────

const startTime = Date.now();
const cacheBackend = process.env.REDIS_URL ? "redis" : "memory";

app.get("/health", (c) => {
  const mem = janda.currentProcess();
  return c.json({
    status: "ok",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: `${pkg.version}`,
    runtime: {
      bun: process.versions.bun,
    },
    process: {
      memory: {
        rss: mem.rss,
        heap: mem.heap,
      },
    },
    cache: {
      backend: cacheBackend,
    },
    graphql: env.JANDAPRESS_GRAPHQL === "true",
    sources: {
      total: 7,
      circuitOpen: getOpenCircuits(),
    },
  });
});

app.get("/", slow, limiter, async (c) => {
  const data = {
    success: true,
    message: "Hi, I'm alive!",
    endpoint: "https://github.com/sinkaroid/jandapress/blob/master/README.md#routing",
    date: new Date().toLocaleString(),
    rss: janda.currentProcess().rss,
    heap: janda.currentProcess().heap,
    server: await janda.getServer(),
    version: `${pkg.version}`,
  };
  logger.info({
    path: c.req.path,
    method: c.req.method,
    ip: getIp(c.req.raw.headers),
    useragent: c.req.header("User-Agent")
  });
  return c.json(data);
});

app.get("/docs", (c) => c.json(openAPISpec));
app.get("/playground", swaggerUI({ url: "/docs" }));

scrapeRoutes(app);

// ── GraphQL (gated behind JANDAPRESS_GRAPHQL) ─────

if (env.JANDAPRESS_GRAPHQL === "true") {
  app.all("/graphql", graphqlHandler);
}

app.get("/g/:id", slow, limiter, (c) => {
  const id = c.req.param("id");

  if (!isNumeric(id)) return c.json({ message: "This path need required number to work" }, 400);

  return c.redirect(`https://nhentai.net/g/${id}`, 301);
});

app.get("/h/:id", slow, limiter, (c) => {
  const id = c.req.param("id");

  if (!isNumeric(id)) return c.json({ message: "This path need required number to work" }, 400);

  return c.redirect(`https://hentaifox.com/gallery/${id}`, 301);
});

app.get("/a/:id", slow, limiter, (c) => {
  const id = c.req.param("id");

  if (!isNumeric(id)) return c.json({ message: "This path need required number to work" }, 400);

  return c.redirect(`https://asmhentai.com/g/${id}`, 301);
});

app.notFound((c) => {
  const message = `The page not found in path ${c.req.path} and method ${c.req.method}`;
  logger.error({
    path: c.req.path,
    method: c.req.method,
    ip: getIp(c.req.raw.headers),
    useragent: c.req.header("User-Agent")
  });
  return c.json({ message }, 404);
});

app.onError((error, c) => {
  logger.error({
    path: c.req.path,
    method: c.req.method,
    ip: getIp(c.req.raw.headers),
    useragent: c.req.header("User-Agent"),
    message: error.message,
    stack: error.stack
  });
  return c.json({
    message: error.message
  }, 500);
});

const port = env.PORT;

console.log(`${pkg.name} is running on port ${port}`);

export default {
  fetch: app.fetch,
  port
};

import type { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { slow, limiter } from "../utils/limit-options";
import type { AppBindings } from "../types/hono-bindings";

// hentaifox
import { searchHentaifox } from "../controller/hentaifox/hentaifoxSearch";
import { getHentaifox } from "../controller/hentaifox/hentaifoxGet";
import { randomHentaifox } from "../controller/hentaifox/hentaifoxRandom";

// hentai2read
import { searchHentai2read } from "../controller/hentai2read/hentai2readSearch";
import { getHentai2read } from "../controller/hentai2read/hentai2readGet";

// nhentai
import { getNhentai } from "../controller/nhentai/nhentaiGet";
import { searchNhentai } from "../controller/nhentai/nhentaiSearch";
import { relatedNhentai } from "../controller/nhentai/nhentaiRelated";
import { randomNhentai } from "../controller/nhentai/nhentaiRandom";

// asmhentai
import { getAsmhentai } from "../controller/asmhentai/asmhentaiGet";
import { searchAsmhentai } from "../controller/asmhentai/asmhentaiSearch";
import { randomAsmhentai } from "../controller/asmhentai/asmhentaiRandom";

// 3hentai
import { get3hentai } from "../controller/3hentai/3hentaiGet";
import { search3hentai } from "../controller/3hentai/3hentaiSearch";
import { random3hentai } from "../controller/3hentai/3hentaiRandom";

// aggregate
import { searchAll } from "../controller/search-all";

// Standard middleware stack for all scrape routes
const standard = [cors(), slow, limiter] as const;

/**
 * Register a GET route with the standard middleware stack.
 * The `as MiddlewareHandler` cast is needed because Hono infers handler types
 * from the middleware array, which doesn't match our Context<AppBindings> signatures.
 */
function route(app: Hono<AppBindings>, path: string, handler: MiddlewareHandler) {
  app.get(path, ...standard, handler);
}

function scrapeRoutes(app: Hono<AppBindings>) {
  route(app, "/search/all", searchAll as MiddlewareHandler);
  route(app, "/hentaifox/search", searchHentaifox as MiddlewareHandler);
  route(app, "/hentaifox/get", getHentaifox as MiddlewareHandler);
  route(app, "/hentaifox/random", randomHentaifox as MiddlewareHandler);
  route(app, "/hentai2read/search", searchHentai2read as MiddlewareHandler);
  route(app, "/hentai2read/get", getHentai2read as MiddlewareHandler);
  route(app, "/asmhentai/get", getAsmhentai as MiddlewareHandler);
  route(app, "/asmhentai/search", searchAsmhentai as MiddlewareHandler);
  route(app, "/asmhentai/random", randomAsmhentai as MiddlewareHandler);
  route(app, "/nhentai/get", getNhentai as MiddlewareHandler);
  route(app, "/nhentai/search", searchNhentai as MiddlewareHandler);
  route(app, "/nhentai/related", relatedNhentai as MiddlewareHandler);
  route(app, "/nhentai/random", randomNhentai as MiddlewareHandler);
  route(app, "/3hentai/get", get3hentai as MiddlewareHandler);
  route(app, "/3hentai/search", search3hentai as MiddlewareHandler);
  route(app, "/3hentai/random", random3hentai as MiddlewareHandler);
}

export default scrapeRoutes;
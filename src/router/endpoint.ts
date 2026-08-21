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


function scrapeRoutes(app: Hono<AppBindings>) {
  app.get("/search/all", cors(), slow, limiter, searchAll as MiddlewareHandler);
  app.get("/hentaifox/search", cors(), slow, limiter, searchHentaifox as MiddlewareHandler);
  app.get("/hentaifox/get", cors(), slow, limiter, getHentaifox as MiddlewareHandler);
  app.get("/hentaifox/random", cors(), slow, limiter, randomHentaifox as MiddlewareHandler);
  app.get("/hentai2read/search", cors(), slow, limiter, searchHentai2read as MiddlewareHandler);
  app.get("/hentai2read/get", cors(), slow, limiter, getHentai2read as MiddlewareHandler);
  app.get("/asmhentai/get", cors(), slow, limiter, getAsmhentai as MiddlewareHandler);
  app.get("/asmhentai/search", cors(), slow, limiter, searchAsmhentai as MiddlewareHandler);
  app.get("/asmhentai/random", cors(), slow, limiter, randomAsmhentai as MiddlewareHandler);
  app.get("/nhentai/get", cors(), slow, limiter, getNhentai as MiddlewareHandler);
  app.get("/nhentai/search", cors(), slow, limiter, searchNhentai as MiddlewareHandler);
  app.get("/nhentai/related", cors(), slow, limiter, relatedNhentai as MiddlewareHandler);
  app.get("/nhentai/random", cors(), slow, limiter, randomNhentai as MiddlewareHandler);
  app.get("/3hentai/get", cors(), slow, limiter, get3hentai as MiddlewareHandler);
  app.get("/3hentai/search", cors(), slow, limiter, search3hentai as MiddlewareHandler);
  app.get("/3hentai/random", cors(), slow, limiter, random3hentai as MiddlewareHandler);
}

export default scrapeRoutes;
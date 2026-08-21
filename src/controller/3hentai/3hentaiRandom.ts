import type { Context } from "hono";
import type { AppBindings } from "../../types/hono-bindings";
import { scrapeContent } from "../../scraper/3hentai/3hentaiGetController";
import { SITES } from "../../utils/constants";

export async function random3hentai(c: Context<AppBindings>) {
  const url = `${SITES.THREEHENTAI}/random`;
  const data = await scrapeContent(url);
  return c.json(data);
}
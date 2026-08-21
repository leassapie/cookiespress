import type { Context } from "hono";
import type { AppBindings } from "../../types/hono-bindings";
import { scrapeContent } from "../../scraper/hentaifox/hentaifoxGetController";
import { SITES } from "../../utils/constants";

export async function randomHentaifox(c: Context<AppBindings>) {
  const url = `${SITES.HENTAIFOX}/random`;
  const data = await scrapeContent(url);
  return c.json(data);
}
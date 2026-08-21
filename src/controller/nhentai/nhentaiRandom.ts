import type { Context } from "hono";
import type { AppBindings } from "../../types/hono-bindings";
import { scrapeContent } from "../../scraper/nhentai/nhentaiGetController";
import { getIdRandomNhentai, nhentaiGetUrl } from "../../utils/nhentai";

export async function randomNhentai(c: Context<AppBindings>) {
  const id = await getIdRandomNhentai();
  const url = nhentaiGetUrl(String(id));
  const data = await scrapeContent(url, true);
  return c.json(data);
}
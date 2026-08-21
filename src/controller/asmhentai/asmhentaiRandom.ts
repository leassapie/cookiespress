import type { Context } from "hono";
import type { AppBindings } from "../../types/hono-bindings";
import { scrapeContent } from "../../scraper/asmhentai/asmhentaiGetController";
import { SITES } from "../../utils/constants";

export async function randomAsmhentai(c: Context<AppBindings>) {
  const url = `${SITES.ASMHENTAI}/random/`;
  const data = await scrapeContent(url);
  return c.json(data);
}
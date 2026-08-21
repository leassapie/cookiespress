import type { Context } from "hono";
import type { AppBindings } from "../../types/hono-bindings";
import { scrapeContent } from "../../scraper/hentai2read/hentai2readSearchController";
import { SITES } from "../../utils/constants";
import { AppError } from "../../utils/app-error";

export async function searchHentai2read(c: Context<AppBindings>) {
  const key = c.req.query("key") || "";
  if (!key) throw new AppError(400, "Parameter book is required");

  const url = `${SITES.HENTAI2READ}/hentai-list/search/${key}`;
  const data = await scrapeContent(url);
  return c.json(data);
}
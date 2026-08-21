import type { Context } from "hono";
import type { AppBindings } from "../../types/hono-bindings";
import { scrapeContent } from "../../scraper/nhentai/nhentaiSearchController";
import { AppError } from "../../utils/app-error";
import { NHENTAI_SEARCH_SORTS, nhentaiSearchUrl } from "../../utils/nhentai";

export async function searchNhentai(c: Context<AppBindings>) {
  const key = c.req.query("key") || "";
  const page = Number(c.req.query("page") || 1);
  const sort = c.req.query("sort") || NHENTAI_SEARCH_SORTS[0];
  if (!key) throw new AppError(400, "Parameter key is required");
  if (!Number.isInteger(page) || page < 1) throw new AppError(400, "Parameter page must be positive integer");
  if (!NHENTAI_SEARCH_SORTS.includes(sort as typeof NHENTAI_SEARCH_SORTS[number])) {
    throw new AppError(400, "Invalid sort: " + NHENTAI_SEARCH_SORTS.join(", "));
  }

  const url = nhentaiSearchUrl(key, page, sort);
  const data = await scrapeContent(url);
  return c.json(data);
}
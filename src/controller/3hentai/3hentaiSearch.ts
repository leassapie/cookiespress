import type { Context } from "hono";
import type { AppBindings } from "../../types/hono-bindings";
import { scrapeContent } from "../../scraper/3hentai/3hentaiSearchController";
import { SITES } from "../../utils/constants";
import { AppError } from "../../utils/app-error";

const sorting = ["recent", "popular-24h", "popular-7d", "popular"];

export async function search3hentai(c: Context<AppBindings>) {
  const key = c.req.query("key") || "";
  const page = c.req.query("page") || "1";
  const sort = c.req.query("sort") || sorting[0];
  if (!key) throw new AppError(400, "Parameter key is required");
  if (!sorting.includes(sort)) throw new AppError(400, "Invalid sort: " + sorting.join(", "));

  const url = `${SITES.THREEHENTAI}/search?q=${key}&page=${page}&sort=${sort}`;
  const data = await scrapeContent(url);
  return c.json(data);
}
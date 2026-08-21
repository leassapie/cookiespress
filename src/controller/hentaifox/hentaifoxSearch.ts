import type { Context } from "hono";
import type { AppBindings } from "../../types/hono-bindings";
import { scrapeContent } from "../../scraper/hentaifox/hentaifoxSearchController";
import { SITES } from "../../utils/constants";
import { AppError } from "../../utils/app-error";

const sorting = ["latest", "popular"];

export async function searchHentaifox(c: Context<AppBindings>) {
  const key = c.req.query("key");
  const page = c.req.query("page") || "1";
  const sort = c.req.query("sort") || sorting[0];
  if (!key) throw new AppError(400, "Parameter key is required");
  if (!sorting.includes(sort)) throw new AppError(400, "Invalid sort: " + sorting.join(", "));

  const url = `${SITES.HENTAIFOX}/search/?q=${key}&sort=${sort}&page=${page}`;
  const data = await scrapeContent(url);
  return c.json(data);
}
import type { Context } from "hono";
import type { AppBindings } from "../../types/hono-bindings";
import { scrapeContent } from "../../scraper/asmhentai/asmhentaiSearchController";
import { SITES } from "../../utils/constants";
import { AppError } from "../../utils/app-error";

export async function searchAsmhentai(c: Context<AppBindings>) {
  const key = c.req.query("key") || "";
  const page = c.req.query("page") || "1";
  if (!key) throw new AppError(400, "Parameter key is required");

  const url = `${SITES.ASMHENTAI}/search/?q=${key}&page=${page}`;
  const data = await scrapeContent(url);
  return c.json(data);
}
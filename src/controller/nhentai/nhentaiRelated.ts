import type { Context } from "hono";
import type { AppBindings } from "../../types/hono-bindings";
import { scrapeContent } from "../../scraper/nhentai/nhentaiRelatedController";
import { AppError } from "../../utils/app-error";
import { isNumeric } from "../../utils/validation";
import { nhentaiRelatedUrl } from "../../utils/nhentai";

export async function relatedNhentai(c: Context<AppBindings>) {
  const book = c.req.query("book");
  if (!book) throw new AppError(400, "Parameter book is required");
  if (!isNumeric(book)) throw new AppError(400, "Value must be number");

  const url = nhentaiRelatedUrl(book);
  const data = await scrapeContent(url);
  return c.json(data);
}
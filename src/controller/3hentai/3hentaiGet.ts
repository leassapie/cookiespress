import type { Context } from "hono";
import type { AppBindings } from "../../types/hono-bindings";
import { scrapeContent } from "../../scraper/3hentai/3hentaiGetController";
import { SITES } from "../../utils/constants";
import { AppError } from "../../utils/app-error";
import { isNumeric } from "../../utils/validation";

export async function get3hentai(c: Context<AppBindings>) {
  const book = c.req.query("book");
  if (!book) throw new AppError(400, "Parameter book is required");
  if (!isNumeric(book)) throw new AppError(400, "Value must be number");

  const url = `${SITES.THREEHENTAI}/d/${book}`;
  const data = await scrapeContent(url);
  return c.json(data);
}
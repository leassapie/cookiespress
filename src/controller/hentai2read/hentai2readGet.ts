import type { Context } from "hono";
import type { AppBindings } from "../../types/hono-bindings";
import { scrapeContent } from "../../scraper/hentai2read/hentai2readGetController";
import { SITES } from "../../utils/constants";
import { AppError } from "../../utils/app-error";

export async function getHentai2read(c: Context<AppBindings>) {
  const book = c.req.query("book");
  if (!book) throw new AppError(400, "Parameter book is required");
  if (book.split("/").length !== 2) {
    throw new AppError(400, "Book must be in format 'book_example/chapter'. Example: 'fate_lewd_summoning/1'");
  }

  const url = `${SITES.HENTAI2READ}/${book}/`;
  const data = await scrapeContent(url);
  return c.json(data);
}
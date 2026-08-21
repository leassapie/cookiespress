import type { Context } from "hono";
import type { AppBindings } from "../../types/hono-bindings";
import { scrapeContent } from "../../scraper/hentaifox/hentaifoxGetController";
import { SITES } from "../../utils/constants";
import { AppError } from "../../utils/app-error";
import { isNumeric } from "../../utils/validation";

export async function getHentaifox(c: Context<AppBindings>) {
  const book = c.req.query("book");
  if (!book) throw new AppError(400, "Parameter book is required");
  if (!isNumeric(book)) throw new AppError(400, "Parameter book must be number");

  const url = `${SITES.HENTAIFOX}/gallery/${book}/`;
  const data = await scrapeContent(url);
  return c.json(data);
}
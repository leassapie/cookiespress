import { scrapeContent } from "../../scraper/hentai2read/hentai2readGetController";
import { SITES as c } from "../../utils/constants";
import { logger } from "../../utils/logger";
import { maybeError } from "../../utils/modifier";
import type { LegacyRequest } from "../../interfaces/legacy-request";
import type { LegacyResponse } from "../../interfaces/legacy-response";

export async function getHentai2read(req: LegacyRequest, res: LegacyResponse) {
  try {
    const book = req.query.book as string;
    if (!book) throw Error("Parameter book is required");
    if (book.split("/").length !== 2) throw Error("Book must be in format 'book_example/chapter'. Example: 'fate_lewd_summoning/1'");
    
    
    
    const url = `${c.HENTAI2READ}/${book}/`;
    const data = await scrapeContent(url);
    logger.info({
      path: req.path,
      query: req.query,
      method: req.method,
      ip: req.ip,
      useragent: req.get("User-Agent")
    });
    return res.json(data);
  } catch (err) {
    const e = err as Error;
    res.status(400).json(maybeError(false, e.message));
  }
}

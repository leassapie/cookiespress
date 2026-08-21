import { scrapeContent } from "../../scraper/nhentai/nhentaiRelatedController";
import { logger } from "../../utils/logger";
import { isNumeric, maybeError } from "../../utils/modifier";
import { nhentaiRelatedUrl } from "../../utils/nhentai";
import type { LegacyRequest } from "../../interfaces/legacy-request";
import type { LegacyResponse } from "../../interfaces/legacy-response";

export async function relatedNhentai(req: LegacyRequest, res: LegacyResponse) {
  try {
    const book = req.query.book as string;
    if (!book) throw Error("Parameter book is required");
    if (!isNumeric(book)) throw Error("Value must be number");

    

    const url = nhentaiRelatedUrl(book);
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

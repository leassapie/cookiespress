import { scrapeContent } from "../../scraper/simply-hentai/simply-hentaiGetController";
import { SITES as c } from "../../utils/constants";
import { logger } from "../../utils/logger";
import { isReachable, maybeError } from "../../utils/modifier";
import type { LegacyRequest } from "../../interfaces/legacy-request";
import type { LegacyResponse } from "../../interfaces/legacy-response";

export async function getSimplyhentai(req: LegacyRequest, res: LegacyResponse) {
  try {
    const book = req.query.book as string;
    if (!book) throw Error("Parameter book is required, Example: idolmaster/from-fumika-fc8496c/all-pages");

    let actualAPI = c.SIMPLY_HENTAI;
    if (!await isReachable(c.SIMPLY_HENTAI)) actualAPI = c.SIMPLY_HENTAI_PROXIFIED;

    
    
    const url = `${actualAPI}/${book}`;
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

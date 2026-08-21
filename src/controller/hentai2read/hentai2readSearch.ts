import { scrapeContent } from "../../scraper/hentai2read/hentai2readSearchController";
import { SITES as c } from "../../utils/constants";
import { logger } from "../../utils/logger";
import { maybeError } from "../../utils/modifier";
import type { LegacyRequest } from "../../interfaces/legacy-request";
import type { LegacyResponse } from "../../interfaces/legacy-response";

export async function searchHentai2read(req: LegacyRequest, res: LegacyResponse) {
  try {
    const key = req.query.key || "";
    if (!key) throw Error("Parameter book is required");

    
    
    const url = `${c.HENTAI2READ}/hentai-list/search/${key}`;
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
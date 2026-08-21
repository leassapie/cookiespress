import { scrapeContent } from "../../scraper/nhentai/nhentaiSearchController";
import { logger } from "../../utils/logger";
import { maybeError } from "../../utils/modifier";
import { NHENTAI_SEARCH_SORTS, nhentaiSearchUrl } from "../../utils/nhentai";
import type { LegacyRequest } from "../../interfaces/legacy-request";
import type { LegacyResponse } from "../../interfaces/legacy-response";

export async function searchNhentai(req: LegacyRequest, res: LegacyResponse) {
  try {
    const key = req.query.key || "";
    const page = Number(req.query.page || 1);
    const sort = req.query.sort as string || NHENTAI_SEARCH_SORTS[0] as string;
    if (!key) throw Error("Parameter key is required");
    if (!Number.isInteger(page) || page < 1) throw Error("Parameter page must be positive integer");
    if (!NHENTAI_SEARCH_SORTS.includes(sort as typeof NHENTAI_SEARCH_SORTS[number])) throw Error("Invalid sort: " + NHENTAI_SEARCH_SORTS.join(", "));

    

    const url = nhentaiSearchUrl(String(key), page, sort);
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

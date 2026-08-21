import { scrapeContent } from "../../scraper/pururin/pururinGetController";
import { SITES as c } from "../../utils/constants";
import { logger } from "../../utils/logger";
import { isNumeric, maybeError } from "../../utils/modifier";
import type { LegacyRequest } from "../../interfaces/legacy-request";
import type { LegacyResponse } from "../../interfaces/legacy-response";

export async function getPururin(req: LegacyRequest, res: LegacyResponse) {
  try {
    const book = req.query.book as string;
    if (!book) throw Error("Parameter book is required");
    if (!isNumeric(book)) throw Error("Parameter book must be number");

    

    const url = `${c.PURURIN}/gallery/${book}/janda`;
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
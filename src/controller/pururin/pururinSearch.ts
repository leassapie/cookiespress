import { scrapeContent } from "../../scraper/pururin/pururinSearchController";
import { SITES as c } from "../../utils/constants";
import { logger } from "../../utils/logger";
import { maybeError } from "../../utils/modifier";
import type { LegacyRequest } from "../../interfaces/legacy-request";
import type { LegacyResponse } from "../../interfaces/legacy-response";

export async function searchPururin(req: LegacyRequest, res: LegacyResponse) {
  try {
    const key = req.query.key as string;
    const page = Number(req.query.page || 1);
    if (!key) throw Error("Parameter key is required");
    if (!Number.isInteger(page) || page < 1) throw Error("Parameter page must be positive integer");

    
    
    const url = `${c.PURURIN}/search?q=${key}&page=${page}`;
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
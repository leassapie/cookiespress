import { scrapeContent } from "../../scraper/nhentai/nhentaiGetController";
import { logger } from "../../utils/logger";
import { getIdRandomNhentai, maybeError } from "../../utils/modifier";
import { nhentaiGetUrl } from "../../utils/nhentai";
import type { LegacyRequest } from "../../interfaces/legacy-request";
import type { LegacyResponse } from "../../interfaces/legacy-response";

export async function randomNhentai(req: LegacyRequest, res: LegacyResponse) {
  try {
    const id = await getIdRandomNhentai();

    

    const url = nhentaiGetUrl(String(id));
    const data = await scrapeContent(url, true);
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
    res.status(400).json(maybeError(false, `Error Try again: ${e.message}`));
  }
}

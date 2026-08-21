import { scrapeContent as nhentaiSearch } from "../scraper/nhentai/nhentaiSearchController";
import { scrapeContent as hentaifoxSearch } from "../scraper/hentaifox/hentaifoxSearchController";
import { scrapeContent as asmhentaiSearch } from "../scraper/asmhentai/asmhentaiSearchController";
import { scrapeContent as hentai2readSearch } from "../scraper/hentai2read/hentai2readSearchController";
import { scrapeContent as threehentaiSearch } from "../scraper/3hentai/3hentaiSearchController";
import { logger } from "../utils/logger";
import { maybeError } from "../utils/modifier";
import type { LegacyRequest } from "../interfaces/legacy-request";
import type { LegacyResponse } from "../interfaces/legacy-response";
import { SITES as c } from "../utils/constants";

interface SearchResult {
  source: string;
  success: boolean;
  data: unknown;
  error?: string;
}

async function searchNhentai(key: string, page = 1): Promise<SearchResult> {
  try {
    const url = `${c.NHENTAI}/api/v2/search?query=${encodeURIComponent(key)}&page=${page}`;
    const data = await nhentaiSearch(url);
    return { source: "nhentai", success: true, data };
  } catch (err) {
    const e = err as Error;
    return { source: "nhentai", success: false, data: [], error: e.message };
  }
}

async function searchHentaifox(key: string, page = 1): Promise<SearchResult> {
  try {
    const url = `${c.HENTAIFOX}/search/?q=${encodeURIComponent(key)}&page=${page}`;
    const data = await hentaifoxSearch(url);
    return { source: "hentaifox", success: true, data };
  } catch (err) {
    const e = err as Error;
    return { source: "hentaifox", success: false, data: [], error: e.message };
  }
}

async function searchAsmhentai(key: string, page = 1): Promise<SearchResult> {
  try {
    const url = `${c.ASMHENTAI}/search/?q=${encodeURIComponent(key)}&page=${page}`;
    const data = await asmhentaiSearch(url);
    return { source: "asmhentai", success: true, data };
  } catch (err) {
    const e = err as Error;
    return { source: "asmhentai", success: false, data: [], error: e.message };
  }
}

async function searchHentai2read(key: string, _page = 1): Promise<SearchResult> {
  try {
    const url = `${c.HENTAI2READ}/hentai-list/search/${encodeURIComponent(key)}`;
    const data = await hentai2readSearch(url);
    return { source: "hentai2read", success: true, data };
  } catch (err) {
    const e = err as Error;
    return { source: "hentai2read", success: false, data: [], error: e.message };
  }
}

async function search3hentai(key: string, page = 1): Promise<SearchResult> {
  try {
    const url = `${c.THREEHENTAI}/search?q=${encodeURIComponent(key)}&page=${page}`;
    const data = await threehentaiSearch(url);
    return { source: "3hentai", success: true, data };
  } catch (err) {
    const e = err as Error;
    return { source: "3hentai", success: false, data: [], error: e.message };
  }
}

export async function searchAll(req: LegacyRequest, res: LegacyResponse) {
  try {
    const key = req.query.key as string;
    const page = Number(req.query.page || 1);
    if (!key) throw Error("Parameter key is required");
    if (!Number.isInteger(page) || page < 1) throw Error("Parameter page must be positive integer");

    const results = await Promise.allSettled([
      searchNhentai(key, page),
      searchHentaifox(key, page),
      searchAsmhentai(key, page),
      searchHentai2read(key, page),
      search3hentai(key, page),
    ]);

    const sources: SearchResult[] = results.map((r) =>
      r.status === "fulfilled" ? r.value : { source: "unknown", success: false, data: [], error: r.reason?.message }
    );

    logger.info({
      path: req.path,
      query: req.query.key,
      method: req.method,
      ip: req.ip,
      sources: sources.filter((s) => s.success).length,
      total: sources.length,
    });

    return res.json({
      success: true,
      key,
      sources,
    });
  } catch (err) {
    const e = err as Error;
    res.status(400).json(maybeError(false, e.message));
  }
}
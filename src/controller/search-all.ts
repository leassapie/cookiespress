import type { Context } from "hono";
import type { AppBindings } from "../types/hono-bindings";
import { scrapeContent as nhentaiSearch } from "../scraper/nhentai/nhentaiSearchController";
import { scrapeContent as hentaifoxSearch } from "../scraper/hentaifox/hentaifoxSearchController";
import { scrapeContent as asmhentaiSearch } from "../scraper/asmhentai/asmhentaiSearchController";
import { scrapeContent as hentai2readSearch } from "../scraper/hentai2read/hentai2readSearchController";
import { scrapeContent as threehentaiSearch } from "../scraper/3hentai/3hentaiSearchController";
import { AppError } from "../utils/app-error";
import { SITES } from "../utils/constants";

// ─── Normalized search item shape ───────────────────

interface NormalizedItem {
  id: string | number;
  title: string;
  cover: string;
  source: string;
  url: string;
  tags?: string[];
  total?: number;
}

function normalizeItem(item: unknown, source: string): NormalizedItem {
  const raw = item as Record<string, unknown>;

  switch (source) {
  case "nhentai": {
    const t = (raw.title as Record<string, string>) || {};
    return {
      id: raw.id as number,
      title: t.pretty || t.english || t.japanese || "",
      cover: (raw.cover as string) || "",
      source: "nhentai",
      url: `https://nhentai.net/g/${raw.id}`,
      tags: (raw.tags as string[]) || [],
      total: raw.total as number,
    };
  }
  case "hentaifox": {
    return {
      id: raw.id as number,
      title: raw.title as string,
      cover: (raw.cover as string) || "",
      source: "hentaifox",
      url: (raw.link as string) || `${SITES.HENTAIFOX}/gallery/${raw.id}`,
      tags: raw.category ? [raw.category as string] : undefined,
    };
  }
  case "asmhentai": {
    return {
      id: raw.id as number,
      title: raw.title as string,
      cover: "",
      source: "asmhentai",
      url: `${SITES.ASMHENTAI}/g/${raw.id}`,
    };
  }
  case "hentai2read": {
    return {
      id: raw.id as string,
      title: raw.title as string,
      cover: (raw.cover as string) || "",
      source: "hentai2read",
      url: (raw.link as string) || "",
    };
  }
  case "3hentai": {
    return {
      id: raw.id as number,
      title: raw.title as string,
      cover: "",
      source: "3hentai",
      url: `${SITES.THREEHENTAI}/d/${raw.id}`,
    };
  }
  default:
    return { id: "", title: "", cover: "", source, url: "" };
  }
}

function extractItems(raw: unknown, source: string): NormalizedItem[] {
  const envelope = raw as { data?: unknown } | null;
  const items = Array.isArray(envelope?.data) ? envelope.data : [];
  return items.map((item) => normalizeItem(item, source));
}

interface SearchResult {
  source: string;
  success: boolean;
  data: NormalizedItem[];
  error?: string;
}

async function searchNhentai(key: string, page = 1): Promise<SearchResult> {
  try {
    const url = `${SITES.NHENTAI}/api/v2/search?query=${encodeURIComponent(key)}&page=${page}`;
    const data = await nhentaiSearch(url);
    return { source: "nhentai", success: true, data: extractItems(data, "nhentai") };
  } catch (err) {
    const e = err as Error;
    return { source: "nhentai", success: false, data: [], error: e.message };
  }
}

async function searchHentaifox(key: string, page = 1): Promise<SearchResult> {
  try {
    const url = `${SITES.HENTAIFOX}/search/?q=${encodeURIComponent(key)}&page=${page}`;
    const data = await hentaifoxSearch(url);
    return { source: "hentaifox", success: true, data: extractItems(data, "hentaifox") };
  } catch (err) {
    const e = err as Error;
    return { source: "hentaifox", success: false, data: [], error: e.message };
  }
}

async function searchAsmhentai(key: string, page = 1): Promise<SearchResult> {
  try {
    const url = `${SITES.ASMHENTAI}/search/?q=${encodeURIComponent(key)}&page=${page}`;
    const data = await asmhentaiSearch(url);
    return { source: "asmhentai", success: true, data: extractItems(data, "asmhentai") };
  } catch (err) {
    const e = err as Error;
    return { source: "asmhentai", success: false, data: [], error: e.message };
  }
}

async function searchHentai2read(key: string, _page = 1): Promise<SearchResult> {
  try {
    const url = `${SITES.HENTAI2READ}/hentai-list/search/${encodeURIComponent(key)}`;
    const data = await hentai2readSearch(url);
    return { source: "hentai2read", success: true, data: extractItems(data, "hentai2read") };
  } catch (err) {
    const e = err as Error;
    return { source: "hentai2read", success: false, data: [], error: e.message };
  }
}

async function search3hentai(key: string, page = 1): Promise<SearchResult> {
  try {
    const url = `${SITES.THREEHENTAI}/search?q=${encodeURIComponent(key)}&page=${page}`;
    const data = await threehentaiSearch(url);
    return { source: "3hentai", success: true, data: extractItems(data, "3hentai") };
  } catch (err) {
    const e = err as Error;
    return { source: "3hentai", success: false, data: [], error: e.message };
  }
}

export async function searchAll(c: Context<AppBindings>) {
  const key = c.req.query("key") || "";
  const page = Number(c.req.query("page") || 1);
  if (!key) throw new AppError(400, "Parameter key is required");
  if (!Number.isInteger(page) || page < 1) throw new AppError(400, "Parameter page must be positive integer");

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

  return c.json({
    success: true,
    key,
    sources,
  });
}
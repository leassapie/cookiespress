import { SITES } from "./constants";
import { logger } from "./logger";
import { defaultUserAgent } from "./user-agent";
import { NhentaiV2GallerySummary } from "../interfaces/nhentai-v2";

export const NHENTAI_SEARCH_SORTS = [
  "date",
  "popular",
  "popular-today",
  "popular-week",
  "popular-month",
] as const;

export function nhentaiGetUrl(book: string) {
  return `${SITES.NHENTAI}/api/v2/galleries/${book}`;
}

export function nhentaiSearchUrl(key: string, page: number, sort: string) {
  return `${SITES.NHENTAI}/api/v2/search?query=${encodeURIComponent(key)}&sort=${encodeURIComponent(sort)}&page=${page}`;
}

export function nhentaiRelatedUrl(book: string) {
  return `${SITES.NHENTAI}/api/v2/galleries/${book}/related`;
}

export function nhentaiRandomUrl() {
  return `${SITES.NHENTAI}/api/v2/galleries/random`;
}

export function mapNhentaiV2Summary(item: NhentaiV2GallerySummary) {
  const pretty = item.english_title || item.japanese_title || "";
  return {
    title: {
      english: item.english_title || "",
      japanese: item.japanese_title || "",
      pretty,
    },
    id: item.id,
    total: item.num_pages,
    cover: item.thumbnail,
    tag_ids: item.tag_ids || [],
    blacklisted: item.blacklisted,
    source: `${SITES.NHENTAI}/g/${item.id}`,
  };
}

// ─── nhentai API auth ────────────────────────────────

/**
 * Common headers for nhentai official API.
 * Uses API key when provided in env.
 */
export function nhentaiHeaders(): Record<string, string> {
  const key = process.env.NHENTAI_API_KEY?.trim();
  const userAgent = process.env.USER_AGENT || defaultUserAgent();
  const maskedKey = key ? `${key.slice(0, 6)}...(${key.length})` : "none";

  logger.info({ message: "nhentai headers ready", apiKey: maskedKey, auth: key ? "Bearer" : "none", userAgent });

  return {
    "User-Agent": userAgent,
    ...(key ? { Authorization: `Bearer ${key}` } : {}),
  };
}

function extractNhentaiId(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) return input;

  if (input && typeof input === "object") {
    const rec = input as Record<string, unknown>;
    const direct = rec.id ?? rec.gallery_id ?? rec.galleryId;

    if (typeof direct === "number" && Number.isFinite(direct)) return direct;

    for (const value of Object.values(rec)) {
      const nested = extractNhentaiId(value);
      if (nested) return nested;
    }
  }

  return null;
}

/**
 * Fetch a random nhentai gallery ID via the official API.
 * Uses the circuit breaker through JandaPress to avoid tripping on transient failures.
 */
export async function getIdRandomNhentai(): Promise<number> {
  // Lazy import to avoid circular dependency (JandaPress imports nhentaiHeaders)
  const { janda } = await import("../JandaPress");
  const res = await janda.simulateNhentaiRequest(nhentaiRandomUrl());
  const body = res as Record<string, unknown>;
  const id = extractNhentaiId(body);

  if (!id) {
    throw new Error("Cannot parse nhentai random gallery id");
  }

  return id;
}
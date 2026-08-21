import got from "got";
import { logger } from "./logger";
import { nhentaiRandomUrl } from "./nhentai";
import * as pkg from "../../package.json";

function runtimeBunVersion(): string {
  const bunFromGlobal = (globalThis as { Bun?: { version?: string } }).Bun?.version;
  return bunFromGlobal ?? process.versions.bun ?? "unknown";
}

export function defaultUserAgent(): string {
  return `${pkg.name}/${pkg.version} Bun/${runtimeBunVersion()}`;
}

/**
 * Parse url
 * @param url
 * @returns string
 */
function getUrl(url: string) {
  return url.replace(/^\/\//, "https://");
}

/**
 * Parse id
 * @param url
 * @returns string
 */
function getId(url: string) {
  return url.replace(/^https?:\/\/[^\\/]+/, "").replace(/\/$/, "");
}

/**
 * Parse alphabet only
 * @param input
 * @returns string
 */
function removeNonNumeric(input: string) {
  return input.replace(/[^0-9]/g, "");
}

/**
 * Parse date format on nhentai
 * @param date
 * @returns string
 */
function getDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Fancy time ago format
 * @param input 
 * @returns string
 */
function timeAgo(input: Date) {
  const date = new Date(input);
  const formatter = new Intl.RelativeTimeFormat("en");
  const ranges: Partial<Record<Intl.RelativeTimeFormatUnit, number>> = {
    years: 3600 * 24 * 365,
    months: 3600 * 24 * 30,
    weeks: 3600 * 24 * 7,
    days: 3600 * 24,
    hours: 3600,
    minutes: 60,
    seconds: 1
  };
  const secondsElapsed = (date.getTime() - Date.now()) / 1000;
  for (const key of Object.keys(ranges) as Intl.RelativeTimeFormatUnit[]) {
    const seconds = ranges[key];
    if (!seconds) continue;
    if (seconds < Math.abs(secondsElapsed)) {
      const delta = secondsElapsed / seconds;
      return formatter.format(Math.round(delta), key);
    }
  }
}

/**
 * Check nhentai status
 * @param url
 * @returns boolean
 */
async function isReachable(url: string) {
  const site = await got(url, {
    throwHttpErrors: false,
    retry: { limit: 0 },
  });
  if (site.statusCode === 200) {
    return true;
  } else if (site.statusCode === 308) {
    return true;
  } else {
    return false;
  }
}

/** 
 * Check if string is numeric
 * @param val
 * @returns boolean
 */
export const isNumeric = (val: string): boolean => {
  return !isNaN(Number(val));
};

/**
 * Simulate random on nhentai
 * @returns Promise<number>
 */

export async function getIdRandomNhentai(): Promise<number> {
  const res = await got(nhentaiRandomUrl(), {
    headers: nhentaiHeaders(),
    throwHttpErrors: false,
    retry: { limit: 0 },
  });

  const body = JSON.parse(res.body) as Record<string, unknown>;
  const id = extractNhentaiId(body);

  if (!id) {
    throw Error("Cannot parse nhentai random gallery id");
  }

  return id;
}

/**
 * Error handler
 * @param success
 * @param message
 * @returns object
 */
export function maybeError(success: boolean, message: string) {
  return { success, message };
}

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
 * Predict the extension of hentaiFox images
 * @param url 
 * @returns Promise<".jpg" | ".webp"> lolz
 */
export async function hentaiFoxPredictedExtension(url: string): Promise<".jpg" | ".webp"> {
  try {
    const jpgUrl = url;
    const res = await got(jpgUrl, { method: "HEAD", throwHttpErrors: false, retry: { limit: 0 } });

    if (res.statusCode === 200) {
      return ".jpg";
    } else {
      return ".webp";
    }
  } catch (err) {
    const e = err as Error;
    logger.error({ message: "hentaiFox extension prediction failed", error: e.message });
    return ".webp";
  }
}

export {
  getUrl, getId, getDate, timeAgo,
  isReachable, removeNonNumeric
};

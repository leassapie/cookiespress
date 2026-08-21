import got from "got";
import Keyv from "keyv";
import KeyvRedis from "@keyv/redis";
import { defaultUserAgent } from "./utils/user-agent";
import { nhentaiHeaders } from "./utils/nhentai";
import { logger } from "./utils/logger";
import { isCircuitOpen, recordFailure, recordSuccess } from "./utils/circuit-breaker";
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
const keyv = process.env.REDIS_URL
  ? new Keyv({ store: new KeyvRedis(process.env.REDIS_URL) })
  : new Keyv();
  
keyv.on("error", err => logger.error({ message: "Keyv connection error", error: (err as Error).message }));
const ttl = 1000 * 60 * 60 * (Number(process.env.EXPIRE_CACHE) || 1);
const GEO_TIMEOUT_MS = 3000;
const LOCATION_CACHE_MS = 60 * 60 * 1000;

// Upstream request defaults — timeout prevents hangs, retry handles transient failures.
const REQUEST_TIMEOUT = { request: 10_000, connect: 5_000 };
const RETRY_STATUS_CODES = [429, 500, 502, 503, 504];
const RETRY_ERROR_CODES = ["ECONNRESET", "ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "EAI_AGAIN"];
let cachedLocation: { value: string; expiresAt: number } | null = null;
class JandaPress {
  url: string;
  useragent: string;
  constructor() {
    this.url = "";
    this.useragent = process.env.USER_AGENT || defaultUserAgent();
  }
  /**
   * Execute nhentai request against official API.
   * @param target url to fetch
   * @returns Promise<unknown>
   * @throws Error
   */
  async simulateNhentaiRequest(target: string): Promise<unknown> {
    const source = hostOf(target);
    if (isCircuitOpen(source)) {
      throw new Error(`${source} temporarily unavailable (circuit open)`);
    }
    try {
      const res = await got(target, {
        headers: nhentaiHeaders(),
        retry: {
          limit: target.includes("/random") ? 0 : 2,
          methods: ["GET"],
          statusCodes: target.includes("/random") ? [] : RETRY_STATUS_CODES,
          errorCodes: target.includes("/random") ? [] : RETRY_ERROR_CODES,
        },
        timeout: REQUEST_TIMEOUT,
      });
      recordSuccess(source);
      return JSON.parse(res.body);
    } catch (err) {
      if (!(err as Error).message.includes("circuit open")) {
        recordFailure(source, err);
      }
      const e = err as Error;
      throw new Error(e.message);
    }
  }
  /**
     * Fetch body from url and check if it's cached
     * @param url url to fetch
     * @returns Buffer 
     */
  async fetchBody(url: string): Promise<Buffer> {
    const source = hostOf(url);
    if (isCircuitOpen(source)) {
      throw new Error(`${source} temporarily unavailable (circuit open)`);
    }

    const isRandom = url.includes("/random");
    if (!isRandom) {
      const cached = await keyv.get(url);
      if (cached) {
        logger.debug({ message: "Fetching from cache", url });
        return cached;
      }
    }

    logger.debug({ message: isRandom ? "Random should not be cached" : "Fetching from source", url });

    try {
      const res = await got(url, {
        headers: { "User-Agent": this.useragent },
        retry: {
          limit: isRandom ? 0 : 2,
          methods: ["GET"],
          statusCodes: isRandom ? [] : RETRY_STATUS_CODES,
          errorCodes: isRandom ? [] : RETRY_ERROR_CODES,
        },
        timeout: REQUEST_TIMEOUT,
      });
      recordSuccess(source);
      const body = Buffer.from(res.rawBody);
      if (!isRandom) {
        await keyv.set(url, body, ttl);
      }
      return body;
    } catch (err) {
      recordFailure(source, err);
      throw new Error((err as Error).message);
    }
  }
  /**
     * Fetch json from url and check if it's cached
     * @param url url to fetch
     * @returns Buffer
     */
  async fetchJson(url: string): Promise<unknown> {
    const cached = await keyv.get(url);
    if (cached) {
      logger.debug({ message: "Fetching from cache", url });
      return cached;
    } else {
      logger.debug({ message: "Fetching from source", url });
      const res = await this.simulateNhentaiRequest(url);
      await keyv.set(url, res, ttl);
      return res;
    }
  }
  currentProcess() {
    const rss = process.memoryUsage().rss / 1024 / 1024;
    const heap = process.memoryUsage().heapUsed / 1024 / 1024;
    const heaptotal = process.memoryUsage().heapTotal / 1024 / 1024;
    return {
      rss: `${Math.round(rss * 100) / 100} MB`,
      heap: `${Math.round(heap * 100) / 100}/${Math.round(heaptotal * 100) / 100} MB`
    };
  }
  async getServer(): Promise<string> {
    try {
      const raw = await got("https://ipwho.is/", {
        timeout: { request: GEO_TIMEOUT_MS },
        retry: { limit: 0 },
        throwHttpErrors: false,
      });
      if (raw.statusCode !== 200) {
        return cachedLocation && cachedLocation.expiresAt > Date.now() ? cachedLocation.value : "Unknown";
      }
      const data = JSON.parse(raw.body) as {
        success?: boolean;
        country?: string;
        region?: string;
      };
      if (data.success === false) {
        return cachedLocation && cachedLocation.expiresAt > Date.now() ? cachedLocation.value : "Unknown";
      }
      const country = data.country?.trim();
      const region = data.region?.trim();
      if (!country || !region) {
        return cachedLocation && cachedLocation.expiresAt > Date.now() ? cachedLocation.value : "Unknown";
      }
      const location = `${country}, ${region}`;
      cachedLocation = { value: location, expiresAt: Date.now() + LOCATION_CACHE_MS };
      return location;
    } catch {
      return cachedLocation && cachedLocation.expiresAt > Date.now() ? cachedLocation.value : "Unknown";
    }
  }
}
export default JandaPress;
export const janda = new JandaPress();
